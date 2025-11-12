import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { useRelevantQuestions } from "@/hooks/use-relevant-questions";
import { getMondoEntityConfig } from "@/types/MondoFileType";
import { useApp } from "@/hooks/use-app";

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

  const visibleQuestions = questions.slice(0, visibleCount);
  const hasMore = questions.length > visibleCount;

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

  const handleLinkClick = useCallback(
    async (question: ReturnType<typeof useRelevantQuestions>["questions"][number], e: MouseEvent) => {
      e.preventDefault();
      
      try {
        const isCmdOrCtrl = (e as any).metaKey || (e as any).ctrlKey;
        const linkPath = question.headingTitle
          ? `${question.filePath}#${question.headingTitle}`
          : question.filePath;
        
        if (isCmdOrCtrl) {
          // Open in new tab
          await app.workspace.openLinkText(linkPath, "", "split");
        } else {
          // Open in current tab
          const activeLeaf = app.workspace.getLeaf(false) || app.workspace.getLeaf(true);
          await app.workspace.openLinkText(linkPath, "", false, {
            active: true,
          });
        }
      } catch (err) {
        console.error("RelevantQuestions: failed to open link", err);
      }
    },
    [app]
  );

  return (
    <Card
      title="Relevant Questions"
      icon="help-circle"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      onCollapseChange={onCollapseChange}
    >
      {isLoading ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          Loading open questions...
        </Typography>
      ) : questions.length === 0 ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          No open questions found in your vault.
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
                        to={question.filePath}
                        className="block text-sm font-medium text-[var(--text-accent)] hover:underline"
                        onClick={(e) => void handleLinkClick(question, e)}
                      >
                        {question.checkboxText}
                      </Link>
                      <Typography
                        variant="body"
                        className="text-xs text-[var(--text-muted)]"
                      >
                        {displayName}
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
