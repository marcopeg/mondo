import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
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

  if (tasks.length === 0) {
    return null;
  }

  const roleName = getEntityDisplayName(file);

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="check-square"
      title="Tasks"
      subtitle={`Tasks referencing ${roleName}`}
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

export default RoleTasksLinks;
