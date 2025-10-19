import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type ParticipantTasksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

export const ParticipantTasksLinks = ({
  file,
  config,
}: ParticipantTasksLinksProps) => {
  const hostFile = file.file;

  const collapsed = (config as any)?.collapsed !== false;
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

  const handleCreateTask = useCallback(() => {
    // TODO: Implement task creation
  }, []);

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
      {...(!hasTasks ? { p: 0 } : {})}
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
        getSortableId={(task) => task.file!.path}
        emptyLabel="No tasks yet"
      />
    </Card>
  );
};

export default ParticipantTasksLinks;
