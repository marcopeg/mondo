import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { addParticipantLink } from "@/utils/participants";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

type ParticipantTasksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

// Focuses the title element (inline title or input) and selects all its content
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;

  // 1) Try inline title (contenteditable element)
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
    } catch (_) {
      // no-op if selection APIs are unavailable
    }
    return true;
  }

  // 2) Try title input (when inline title is configured as an input)
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

export const ParticipantTasksLinks = ({
  file,
  config,
}: ParticipantTasksLinksProps) => {
  const app = useApp();
  const entityType = file.cache?.frontmatter?.type as string | undefined;
  const taskFolderPath = useSetting<string>("rootPaths.task", "");
  const [isCreating, setIsCreating] = useState(false);

  const hostFile = file.file;

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.tasks?.collapsed === true) return true;
    if (crmState?.tasks?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);
  const entityName = getEntityDisplayName(file);

  const tasks = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (
          !hostFile ||
          !candidate.file ||
          candidate.file.path === hostFile.path
        )
          return false;
        return matchesPropertyLink(candidate, "participants", hostFile);
      },
      [hostFile]
    ),
  });

  const validTasks = useMemo(
    () => tasks.filter((task) => Boolean(task.file)),
    [tasks]
  );

  const getTaskId = useCallback((task: TCachedFile) => task.file?.path, []);

  const sortTasksByLabel = useCallback((entries: TCachedFile[]) => {
    return [...entries].sort((a, b) => {
      const labelA = getTaskLabel(a).toLowerCase();
      const labelB = getTaskLabel(b).toLowerCase();
      return labelA.localeCompare(labelB);
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
    fallbackSort: sortTasksByLabel,
  });

  const hasTasks = orderedTasks.length > 0;

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;

      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {};
          }

          if (
            typeof frontmatter.crmState.tasks !== "object" ||
            frontmatter.crmState.tasks === null
          ) {
            frontmatter.crmState.tasks = {};
          }

          frontmatter.crmState.tasks.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "ParticipantTasksLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, hostFile]
  );

  if (!hostFile) {
    return (
      <Card
        collapsible
        collapsed={collapsed}
        collapseOnHeaderClick
        icon="check-square"
        title="Tasks"
      >
        <div className="px-2 py-2 text-xs text-[var(--text-muted)]">
          Save this note to start linking tasks.
        </div>
      </Card>
    );
  }

  const handleCreateTask = useCallback(async () => {
    if (isCreating || !hostFile) {
      return;
    }

    setIsCreating(true);

    try {
      // Get plugin settings for root paths and templates
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

      // Create file path
      const safeBase = sanitizeFileName("Untitled Task");
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
          title: "Untitled Task",
          type: String(CRMFileType.TASK),
          filename: fileName,
          slug: "untitled-task",
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        taskFile = await app.vault.create(filePath, content);
      }

      // Add participant link to the task
      if (taskFile) {
        const linkTarget = app.metadataCache.fileToLinktext(
          hostFile,
          taskFile.path
        );
        const link = `[[${linkTarget}]]`;
        await addParticipantLink(app, taskFile, link);
      }

      // Open the task file
      const leaf = app.workspace.getLeaf(false);
      if (leaf && taskFile) {
        await (leaf as any).openFile(taskFile);

        // Focus and select title
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === taskFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("ParticipantTasksLinks: failed to create task", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, hostFile, isCreating]);

  const actions = [
    {
      key: "task-create",
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
        items={orderedTasks}
        getKey={(task) => task.file!.path}
        renderRow={(task) => {
          const taskFile = task.file!;
          const label = getTaskLabel(task);
          const status = getTaskStatus(task);
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
        getSortableId={(task) => task.file!.path}
        emptyLabel="No tasks yet"
      />
    </Card>
  );
};

export default ParticipantTasksLinks;
