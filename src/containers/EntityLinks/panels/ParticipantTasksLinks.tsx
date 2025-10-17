import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
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

  if (tasks.length === 0) {
    return null;
  }

  const entityName =
    (file.cache?.frontmatter?.show as string | undefined)?.trim() ||
    hostFile.basename;

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="check-square"
      title="Tasks"
      subtitle={`Tasks referencing ${entityName}`}
    >
      <Stack direction="column" gap={2}>
        {tasks.map((task) => {
          if (!task.file) {
            return null;
          }
          const label = getTaskLabel(task);
          const status = getTaskStatus(task);
          return (
            <div
              key={task.file.path}
              className="rounded-sm border border-transparent p-2 hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]"
            >
              <Stack direction="row" justify="space-between" align="center">
                <Link
                  to={task.file.path}
                  className="text-sm font-medium text-[var(--text-accent)] hover:underline"
                >
                  {label}
                </Link>
                {status && (
                  <Typography
                    variant="muted"
                    className="text-xs uppercase tracking-wide"
                  >
                    {status}
                  </Typography>
                )}
              </Stack>
            </div>
          );
        })}
      </Stack>
    </Card>
  );
};

export default ParticipantTasksLinks;
