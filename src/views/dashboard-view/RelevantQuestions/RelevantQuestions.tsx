import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { ReadableDate } from "@/components/ui/ReadableDate";
import { useRelevantQuestions } from "@/hooks/use-relevant-questions";
import { getMondoEntityConfig } from "@/types/MondoFileType";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import getMondoPlugin from "@/utils/getMondoPlugin";

type TasksMode = "alphabetical" | "history";

type RelevantQuestionsProps = {
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
};

export const RelevantQuestions = ({
  collapsed = false,
  onCollapseChange,
}: RelevantQuestionsProps) => {
  const app = useApp();
  const { questions, isLoading, toggleQuestion } = useRelevantQuestions();
  const [visibleCount, setVisibleCount] = useState(5);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  
  const modeSetting = useSetting<TasksMode>(
    "dashboard.relevantTasksMode",
    "history"
  );
  const sanitizedModeSetting: TasksMode =
    modeSetting === "alphabetical" ? "alphabetical" : "history";
  const [mode, setMode] = useState<TasksMode>(sanitizedModeSetting);

  useEffect(() => {
    setMode(sanitizedModeSetting);
  }, [sanitizedModeSetting]);

  // Sort questions based on mode
  const sortedQuestions = useMemo(() => {
    const sorted = [...questions];
    if (mode === "alphabetical") {
      sorted.sort((a, b) => a.checkboxText.localeCompare(b.checkboxText));
    }
    // "history" mode is already sorted by time in the hook
    return sorted;
  }, [questions, mode]);

  const [searchQuery, setSearchQuery] = useState("");

  // Filter questions based on search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedQuestions;
    }
    const lowerQuery = searchQuery.toLowerCase();
    return sortedQuestions.filter(q => 
      q.checkboxText.toLowerCase().includes(lowerQuery) ||
      q.noteTitle.toLowerCase().includes(lowerQuery) ||
      (q.show && q.show.toLowerCase().includes(lowerQuery))
    );
  }, [sortedQuestions, searchQuery]);

  const visibleQuestions = filteredQuestions.slice(0, visibleCount);
  const hasMore = filteredQuestions.length > visibleCount;

  const setPendingState = useCallback((questionId: string, active: boolean) => {
    setPending((prev) => {
      if (active) {
        if (prev[questionId]) return prev;
        return { ...prev, [questionId]: true };
      }
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const handleToggle = useCallback(
    async (question: ReturnType<typeof useRelevantQuestions>["questions"][number]) => {
      setPendingState(question.id, true);
      try {
        await toggleQuestion(question);
      } finally {
        setPendingState(question.id, false);
      }
    },
    [toggleQuestion, setPendingState]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 5);
  }, []);

  const persistModeSetting = useCallback(
    async (nextMode: TasksMode) => {
      const plugin = getMondoPlugin(app);
      if (!plugin) {
        return;
      }

      const settings = plugin.settings ?? {};
      const dashboardSettings = settings.dashboard ?? {};
      if (dashboardSettings.relevantTasksMode === nextMode) {
        return;
      }

      plugin.settings = {
        ...settings,
        dashboard: {
          ...dashboardSettings,
          relevantTasksMode: nextMode,
        },
      };

      try {
        await plugin.saveSettings?.();
      } catch (error) {
        console.debug(
          "RelevantTasks: failed to persist mode setting",
          error
        );
      }

      try {
        window.dispatchEvent(new CustomEvent("mondo:settings-updated"));
      } catch (error) {
        console.debug(
          "RelevantTasks: failed to dispatch settings update event",
          error
        );
      }
    },
    [app]
  );

  const handleModeChange = useCallback(
    (checked: boolean) => {
      const nextMode: TasksMode = checked ? "history" : "alphabetical";
      setMode(nextMode);
      void persistModeSetting(nextMode);
    },
    [persistModeSetting]
  );

  const handleLinkClick = useCallback(
    async (question: ReturnType<typeof useRelevantQuestions>["questions"][number], e: MouseEvent) => {
      e.preventDefault();
      
      try {
        const isCmdOrCtrl = (e as any).metaKey || (e as any).ctrlKey;
        const file = question.file;
        const lineNumber = question.lineStart;
        
        // Open file in new leaf if Cmd/Ctrl is pressed
        const leaf = isCmdOrCtrl 
          ? app.workspace.getLeaf('tab')
          : app.workspace.getLeaf(false);
        
        if (!leaf) return;
        
        // Open the file
        await (leaf as any).openFile(file, {
          eState: {
            cursor: {
              from: { line: lineNumber, ch: 0 },
              to: { line: lineNumber, ch: 0 }
            }
          }
        });
        
        // Ensure the leaf is visible
        app.workspace.revealLeaf(leaf);
      } catch (err) {
        console.error("RelevantQuestions: failed to open link", err);
      }
    },
    [app]
  );

  return (
    <Card
      title="Relevant Tasks"
      icon="check-square"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      onCollapseChange={onCollapseChange}
      actions={[
        {
          key: "search-field",
          content: (
            <input
              type="text"
              placeholder="Search Relevant Tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2 py-1 text-sm border border-[var(--background-modifier-border)] rounded bg-[var(--background-primary)] text-[var(--text-normal)]"
              style={{ width: "200px" }}
            />
          ),
        },
        {
          key: "mode-toggle",
          content: (
            <Switch
              checked={mode === "history"}
              onCheckedChange={handleModeChange}
              uncheckedLabel="a-z"
              checkedLabel="history"
              aria-label="Toggle relevant tasks sorting mode"
            />
          ),
        },
      ]}
    >
      {isLoading ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          Loading open tasks...
        </Typography>
      ) : questions.length === 0 ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          No open tasks found in your vault.
        </Typography>
      ) : filteredQuestions.length === 0 ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          No tasks match your search.
        </Typography>
      ) : (
        <Stack direction="column" gap={2} className="w-full">
          {visibleQuestions.map((question) => {
            const isBusy = Boolean(pending[question.id]);
            const config = question.noteType
              ? getMondoEntityConfig(question.noteType)
              : null;
            const iconName = config?.icon;
            const entityName = config?.name ?? question.noteType;
            const displayName = question.show || question.noteTitle;
            
            // Build the link path with heading if available
            const linkPath = question.headingTitle
              ? `${question.filePath}#${question.headingTitle}`
              : question.filePath;

            return (
              <div
                key={question.id}
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
                        void handleToggle(question);
                      }}
                      aria-label={`Complete question "${question.checkboxText}"`}
                    />
                    <Stack
                      direction="column"
                      gap={1}
                      className="flex-1 min-w-0"
                    >
                      <Link
                        to={linkPath}
                        className="block text-sm font-medium text-[var(--text-accent)] hover:underline"
                        onClick={(e) => void handleLinkClick(question, e)}
                      >
                        {question.checkboxText}
                      </Link>
                      <Typography
                        variant="body"
                        className="text-xs text-[var(--text-muted)]"
                      >
                        {displayName},{" "}
                        <ReadableDate value={question.lastModified} />
                      </Typography>
                    </Stack>
                  </Stack>
                  {entityName && iconName && (
                    <Stack direction="row" align="center" gap={1} className="shrink-0">
                      <Icon name={iconName} />
                      <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        {entityName}
                      </span>
                    </Stack>
                  )}
                </Stack>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex w-full flex-col gap-2 pt-1">
              <Separator />
              <Button
                type="button"
                variant="link"
                fullWidth
                className="text-xs px-2 py-2"
                aria-label="Load more questions"
                onClick={handleLoadMore}
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

export default RelevantQuestions;
