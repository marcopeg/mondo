import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import PeopleTable from "@/components/PeopleTable";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTaskLabel, getTaskStatus } from "@/utils/taskMetadata";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const RoleLinks = () => {
  const { file } = useEntityFile();

  const peopleList = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (personCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesAnyPropertyLink(personCached, ["role", "roles"], file.file);
      },
      [file]
    ),
  });

  const tasksList = useFiles(CRMFileType.TASK, {
    filter: useCallback(
      (taskCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesAnyPropertyLink(taskCached, ["role", "roles"], file.file);
      },
      [file]
    ),
  });

  const roleName = file ? getEntityDisplayName(file) : "this role";
  const peopleSubtitle = file
    ? `People linked to ${roleName}`
    : "People with this role";

  return (
    <>
      <Card
        icon={"user"}
        title="People"
        subtitle={peopleSubtitle}
        mt={4}
        p={0}
      >
        <PeopleTable items={peopleList} />
      </Card>
      {tasksList.length > 0 && (
        <Card
          icon="check-square"
          title="Tasks"
          subtitle={`Tasks referencing ${roleName}`}
          mt={4}
        >
          <Stack direction="column" gap={2}>
            {tasksList.map((task) => {
              if (!task.file) return null;
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
      )}
    </>
  );
};
