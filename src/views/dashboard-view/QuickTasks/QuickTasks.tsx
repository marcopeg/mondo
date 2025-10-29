import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { useInboxTasks, type InboxTask } from "@/hooks/use-inbox-tasks";
import Button from "@/components/ui/Button";
import SplitButton from "@/components/ui/SplitButton";
import { Separator } from "@/components/ui/Separator";
import QuickTask from "../QuickTaskEntry";
import { ReadableDate } from "@/components/ui/ReadableDate";

type UseInboxTasksState = ReturnType<typeof useInboxTasks>;

type QuickTasksCardProps = {
  collapsed: boolean;
  state: UseInboxTasksState;
};

const QuickTasksCard = ({ collapsed, state }: QuickTasksCardProps) => {
  const { tasks, isLoading, toggleTask, promoteTask } = state;
  const [visible, setVisible] = useState(5);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const visibleTasks = tasks.slice(0, visible);
  const showLoadMore = tasks.length > visible;
  const setPendingState = useCallback((taskId: string, active: boolean) => {
    setPending((prev) => {
      if (active) {
        if (prev[taskId]) return prev;
        return { ...prev, [taskId]: true };
      }
      if (!prev[taskId]) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const handlePromote = useCallback(
    async (task: InboxTask, target: "task" | "project" | "log") => {
      setPendingState(task.id, true);
      try {
        await promoteTask(task, target);
      } finally {
        setPendingState(task.id, false);
      }
    },
    [promoteTask, setPendingState]
  );

  // header shows only the quick task input; no counter badge

  return (
    <Card
      icon="list-checks"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      actions={[
        {
          // Render the quick task creator inline in the title area
          content: (
            <div className="flex-1 min-w-0">
              <QuickTask iconOnly />
            </div>
          ),
        },
      ]}
    >
      {isLoading ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          Loading inbox tasks...
        </Typography>
      ) : tasks.length === 0 ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          No open tasks in Inbox.
        </Typography>
      ) : (
        <Stack direction="column" gap={2} className="w-full">
          {visibleTasks.map((task) => {
            const fallbackHints: string[] = [];
            if (!task.hasExplicitDate) {
              fallbackHints.push("Date inferred from note creation");
            }
            if (!task.hasExplicitTime) {
              fallbackHints.push("Time inferred from note creation");
            }
            const timestampTitle =
              fallbackHints.length > 0 ? fallbackHints.join(" • ") : null;
            const isBusy = Boolean(pending[task.id]);
            return (
              <div
                key={task.id}
                className="rounded-sm border border-transparent p-2 hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]"
              >
                <Stack
                  direction="row"
                  align="start"
                  justify="space-between"
                  gap={3}
                  className="w-full"
                >
                  <Stack
                    direction="row"
                    align="start"
                    gap={2}
                    className="flex-1 min-w-0"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--interactive-accent)]"
                      checked={false}
                      disabled={isBusy}
                      onChange={() => {
                        if (isBusy) return;
                        void toggleTask(task);
                      }}
                      aria-label={`Complete task "${task.text || task.raw}"`}
                    />
                    <Stack
                      direction="column"
                      gap={1}
                      className="flex-1 min-w-0"
                    >
                      <div className="max-w-full overflow-x-auto">
                        <Link
                          to={task.filePath}
                          className="block w-full whitespace-nowrap text-sm font-medium text-[var(--text-accent)] hover:underline"
                        >
                          {task.text || task.raw}
                        </Link>
                      </div>
                      <Typography
                        variant="body"
                        className="text-xs text-[var(--text-muted)]"
                      >
                        <ReadableDate
                          value={task.occurredAt}
                          fallback="—"
                          extraHint={timestampTitle}
                        />
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap={1} className="shrink-0">
                    <SplitButton
                      type="button"
                      className="text-xs px-2 py-1"
                      toggleClassName="text-xs px-1 py-1"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        void handlePromote(task, "task");
                      }}
                      icon="check-square"
                      menuAriaLabel="Promote inbox task"
                      secondaryActions={[
                        {
                          label: "project",
                          icon: "folder-git-2",
                          disabled: isBusy,
                          onSelect: () => {
                            if (isBusy) return;
                            void handlePromote(task, "project");
                          },
                        },
                        {
                          label: "log",
                          icon: "file-clock",
                          disabled: isBusy,
                          onSelect: () => {
                            if (isBusy) return;
                            void handlePromote(task, "log");
                          },
                        },
                      ]}
                    >
                      task
                    </SplitButton>
                  </Stack>
                </Stack>
              </div>
            );
          })}
          {showLoadMore && (
            <div className="flex w-full flex-col gap-2 pt-1">
              <Separator />
              <Button
                type="button"
                variant="link"
                fullWidth
                className="text-xs px-2 py-2"
                aria-label="Load more inbox tasks"
                onClick={() => {
                  setVisible((prev) => prev + 5);
                }}
              >
                Load more
              </Button>
            </div>
          )}
        </Stack>
      )}
    </Card>
  );
};

type QuickTasksProps = {
  collapsed?: boolean;
  state?: UseInboxTasksState;
};

export const QuickTasks = ({ collapsed = false, state }: QuickTasksProps) => {
  if (state) {
    return <QuickTasksCard collapsed={collapsed} state={state} />;
  }

  const hookState = useInboxTasks();
  return <QuickTasksCard collapsed={collapsed} state={hookState} />;
};
