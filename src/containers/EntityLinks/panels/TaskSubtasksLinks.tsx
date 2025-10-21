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

type TaskSubtasksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

// Focuses the title element (inline title or input) and selects all its content
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
    } catch (_) {}
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

export const TaskSubtasksLinks = ({ file, config }: TaskSubtasksLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const [isCreating, setIsCreating] = useState(false);

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.subtasks?.collapsed === true) return true;
    if (crmState?.subtasks?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const subtasks = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (
          !hostFile ||
          !candidate.file ||
          candidate.file.path === hostFile.path
        ) {
          return false;
        }
        // A sub-task is a task that references the current task in the "task" property
        return matchesPropertyLink(candidate, "task", hostFile);
      },
      [hostFile]
    ),
  });

  const validSubtasks = useMemo(
    () => subtasks.filter((t) => Boolean(t.file)),
    [subtasks]
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
    items: orderedSubtasks,
    onReorder,
    sortable,
  } = useEntityLinkOrdering({
    file,
    items: validSubtasks,
    frontmatterKey: "subtasks",
    getItemId: getTaskId,
    fallbackSort: sortByLabel,
  });

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
            typeof (frontmatter as any).crmState.subtasks !== "object" ||
            (frontmatter as any).crmState.subtasks === null
          ) {
            (frontmatter as any).crmState.subtasks = {};
          }

          (frontmatter as any).crmState.subtasks.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "TaskSubtasksLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, hostFile]
  );

  const handleCreateSubtask = useCallback(async () => {
    if (isCreating || !hostFile) return;
    setIsCreating(true);

    try {
      // Resolve settings for root path and templates
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

      // Ensure folder exists
      if (normalizedFolder) {
        const existingFolder =
          app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await app.vault.createFolder(normalizedFolder);
        }
      }

      const safeBase = sanitizeFileName("Untitled Task");
      const fileName = `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;

      let subTaskFile = app.vault.getAbstractFileByPath(
        filePath
      ) as TFile | null;

      if (!subTaskFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.TASK
        );

        const content = renderTemplate(templateSource, {
          title: "Untitled Task",
          type: String(CRMFileType.TASK),
          filename: fileName,
          slug: "untitled-task",
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        subTaskFile = await app.vault.create(filePath, content);
      }

      if (subTaskFile) {
        // Link the new task to the current task via the "task" property
        // Generate link text to the parent (hostFile) from the perspective of the new subTaskFile
        const parentLinktext = app.metadataCache.fileToLinktext(
          hostFile,
          subTaskFile.path
        );

        await app.fileManager.processFrontMatter(subTaskFile, (fm) => {
          // Set a single-valued 'task' property pointing to the parent task
          (fm as any).task = `[[${parentLinktext}]]`;
        });
      }

      // Open and focus title for quick rename
      const leaf = app.workspace.getLeaf(false);
      if (leaf && subTaskFile) {
        await (leaf as any).openFile(subTaskFile);
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === subTaskFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("TaskSubtasksLinks: failed to create sub-task", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, hostFile, isCreating]);

  const actions = [
    {
      key: "subtask-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create sub-task"
          onClick={handleCreateSubtask}
        />
      ),
    },
  ];

  const taskName = getEntityDisplayName(file);

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="check-square"
      title="Tasks"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={orderedSubtasks}
        getKey={(t) => t.file!.path}
        renderRow={(t) => {
          const taskFile = t.file!;
          const label = getTaskLabel(t);
          const status = getTaskStatus(t);
          return (
            <>
              <Table.Cell className="px-2 py-2 align-top break-words overflow-hidden">
                <Button
                  to={taskFile.path}
                  variant="link"
                  className="break-words whitespace-normal"
                >
                  {label}
                </Button>
              </Table.Cell>
              <Table.Cell className="px-2 py-2 align-middle text-right">
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
        emptyLabel="No sub-tasks yet"
      />
    </Card>
  );
};

export default TaskSubtasksLinks;
