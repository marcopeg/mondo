import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

type MeetingTasksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

// Focus and select note title for quick rename
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;
  const inlineTitleEl: HTMLElement | null =
    view?.contentEl?.querySelector?.(".inline-title") ??
    view?.containerEl?.querySelector?.(".inline-title") ??
    null;
  if (inlineTitleEl) {
    inlineTitleEl.focus();
    try {
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(inlineTitleEl);
        selection.addRange(range);
      }
    } catch {}
    return true;
  }
  const titleInput: HTMLInputElement | undefined =
    view?.fileView?.inputEl ?? view?.titleEl?.querySelector?.("input");
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
    return true;
  }
  return false;
};

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "untitled";

export const MeetingTasksLinks = ({ file, config }: MeetingTasksLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const [isCreating, setIsCreating] = useState(false);

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.tasks?.collapsed === true) return true;
    if (crmState?.tasks?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const tasks = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (
          !hostFile ||
          !candidate.file ||
          candidate.file.path === hostFile.path
        ) {
          return false;
        }
        return matchesPropertyLink(candidate, "meeting", hostFile);
      },
      [hostFile]
    ),
  });

  const validTasks = useMemo(
    () => tasks.filter((t) => Boolean(t.file)),
    [tasks]
  );

  const getTaskId = useCallback((t: TCachedFile) => t.file?.path, []);

  const sortByLabel = useCallback((entries: TCachedFile[]) => {
    return [...entries].sort((a, b) => {
      const aLabel = getTaskLabel(a).toLowerCase();
      const bLabel = getTaskLabel(b).toLowerCase();
      return aLabel.localeCompare(bLabel);
    });
  }, []);

  const {
    items: orderedTasks,
    onReorder,
    sortable,
  } = useEntityLinkOrdering({
    file,
    items: validTasks,
    frontmatterKey: "tasks",
    getItemId: getTaskId,
    fallbackSort: sortByLabel,
  });

  // No date/time helpers needed for 'Untitled Task' default title

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;
      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {} as any;
          }
          if (
            typeof (frontmatter as any).crmState.tasks !== "object" ||
            (frontmatter as any).crmState.tasks === null
          ) {
            (frontmatter as any).crmState.tasks = {};
          }
          (frontmatter as any).crmState.tasks.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "MeetingTasksLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, hostFile]
  );

  const handleCreateTask = useCallback(async () => {
    if (isCreating || !hostFile) return;
    setIsCreating(true);
    try {
      const pluginInstance = (app as any).plugins?.plugins?.["crm"] as
        | {
            settings?: {
              rootPaths?: Partial<Record<CRMFileType, string>>;
              templates?: Partial<Record<CRMFileType, string>>;
            };
          }
        | undefined;
      if (!pluginInstance?.settings) {
        throw new Error("CRM plugin settings are not available.");
      }

      const settings = pluginInstance.settings;
      const folderSetting = settings.rootPaths?.[CRMFileType.TASK] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);
      if (normalizedFolder) {
        const existingFolder =
          app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) await app.vault.createFolder(normalizedFolder);
      }

      const defaultTitle = "Untitled Task";

      const safeBase = sanitizeFileName(defaultTitle);
      const fileName = `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;
      let taskFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;

      if (!taskFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.TASK
        );
        const content = renderTemplate(templateSource, {
          title: defaultTitle,
          type: String(CRMFileType.TASK),
          filename: fileName,
          slug: safeBase.toLowerCase(),
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });
        taskFile = await app.vault.create(filePath, content);
      }

      if (taskFile) {
        // Set 'meeting' property to link back to the current meeting
        const meetingLinktext = app.metadataCache.fileToLinktext(
          hostFile,
          taskFile.path
        );
        await app.fileManager.processFrontMatter(taskFile, (fm) => {
          (fm as any).meeting = `[[${meetingLinktext}]]`;
        });
      }

      const leaf = app.workspace.getLeaf(false);
      if (leaf && taskFile) {
        await (leaf as any).openFile(taskFile);
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === taskFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("MeetingTasksLinks: failed to create task", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, file, hostFile, isCreating]);

  const actions = [
    {
      key: "meeting-task-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create task"
          onClick={handleCreateTask}
        />
      ),
    },
  ];

  const meetingName = getEntityDisplayName(file);

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="check-square"
      title="Tasks"
      subtitle={`Tasks for ${meetingName}`}
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={orderedTasks}
        getKey={(t) => t.file!.path}
        renderRow={(t) => {
          const taskFile = t.file!;
          const label = getTaskLabel(t);
          const status = getTaskStatus(t);
          return (
            <>
              <Table.Cell className="px-2 py-2 align-top">
                <Button to={taskFile.path} variant="link">
                  {label}
                </Button>
              </Table.Cell>
              <Table.Cell className="px-2 py-2 align-top text-right">
                {status ? (
                  <Typography
                    variant="muted"
                    className="text-xs uppercase tracking-wide"
                  >
                    {status}
                  </Typography>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </Table.Cell>
            </>
          );
        }}
        sortable={sortable}
        onReorder={onReorder}
        getSortableId={(t) => t.file!.path}
        emptyLabel="No tasks yet"
      />
    </Card>
  );
};

export default MeetingTasksLinks;
