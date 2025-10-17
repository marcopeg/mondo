import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type RoleTasksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

export const RoleTasksLinks = ({ file, config }: RoleTasksLinksProps) => {
  if (!file.file) {
    return null;
  }

  const tasks = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) {
          return false;
        }
        return matchesAnyPropertyLink(candidate, ["role", "roles"], file.file);
      },
      [file.file]
    ),
  });

  const validTasks = useMemo(
    () => tasks.filter((task) => Boolean(task.file)),
    [tasks]
  );

  if (validTasks.length === 0) {
    return null;
  }

  const roleName = getEntityDisplayName(file);
  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="check-square"
      title="Tasks"
      subtitle={`Tasks referencing ${roleName}`}
    >
      <EntityLinksTable
        items={validTasks}
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
      />
    </Card>
  );
};

export default RoleTasksLinks;
