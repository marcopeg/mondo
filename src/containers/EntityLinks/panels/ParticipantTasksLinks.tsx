import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
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
  if (!hostFile) {
    return null;
  }

  const tasks = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!candidate.file || candidate.file.path === hostFile.path)
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

  if (validTasks.length === 0) {
    return null;
  }

  const entityName =
    (file.cache?.frontmatter?.show as string | undefined)?.trim() ||
    hostFile.basename;

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="check-square"
      title="Tasks"
      subtitle={`Tasks referencing ${entityName}`}
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

export default ParticipantTasksLinks;
