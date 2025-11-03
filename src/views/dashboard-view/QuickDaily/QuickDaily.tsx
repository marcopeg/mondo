import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { ReadableDate } from "@/components/ui/ReadableDate";
import SplitButton from "@/components/ui/SplitButton";
import QuickDailyEntry from "../QuickDailyEntry";
import useQuickDailyEntries, {
  type QuickDailyState,
} from "@/hooks/use-quick-daily";
import { MONDO_ENTITIES, MONDO_ENTITY_TYPES } from "@/entities";
import {
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
  type MondoFileType,
} from "@/types/MondoFileType";

type QuickDailyCardProps = {
  collapsed: boolean;
  state: QuickDailyState;
};

const QuickDailyCard = ({ collapsed, state }: QuickDailyCardProps) => {
  const { entries, isLoading, addEntry, markEntryDone, convertEntry } = state;
  const [visible, setVisible] = useState(5);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const visibleEntries = useMemo(
    () => entries.slice(0, visible),
    [entries, visible]
  );
  const showLoadMore = entries.length > visible;

  const convertTypeOptions = useMemo(() => {
    const preferred: MondoFileType[] = [
      "task",
      "note",
      "project",
      "log",
    ] as MondoFileType[];
    const normalized = new Set<string>();
    const result: MondoFileType[] = [];

    const pushType = (raw: string | null | undefined) => {
      if (!raw) {
        return;
      }
      const type = raw.trim().toLowerCase();
      if (
        !type ||
        normalized.has(type) ||
        type === DAILY_NOTE_TYPE ||
        type === LEGACY_DAILY_NOTE_TYPE
      ) {
        return;
      }
      normalized.add(type);
      result.push(type as MondoFileType);
    };

    preferred.forEach(pushType);
    MONDO_ENTITY_TYPES.forEach(pushType);

    return result.length > 0 ? result : (["note"] as MondoFileType[]);
  }, []);

  const setPendingState = useCallback((entryId: string, active: boolean) => {
    setPending((prev) => {
      if (active) {
        if (prev[entryId]) {
          return prev;
        }
        return { ...prev, [entryId]: true };
      }
      if (!prev[entryId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  }, []);

  const handleComplete = useCallback(
    async (entryId: string) => {
      const target = entries.find((item) => item.id === entryId);
      if (!target) {
        return;
      }
      setPendingState(entryId, true);
      try {
        await markEntryDone(target);
      } finally {
        setPendingState(entryId, false);
      }
    },
    [entries, markEntryDone, setPendingState]
  );

  const handleConvert = useCallback(
    async (entryId: string, targetType: MondoFileType) => {
      const target = entries.find((item) => item.id === entryId);
      if (!target) {
        return;
      }
      setPendingState(entryId, true);
      try {
        await convertEntry(target, targetType);
      } finally {
        setPendingState(entryId, false);
      }
    },
    [convertEntry, entries, setPendingState]
  );

  const resolveTypeMeta = (type: MondoFileType) =>
    MONDO_ENTITIES[type as keyof typeof MONDO_ENTITIES];

  const toTitleCase = (value: string) => {
    if (!value) {
      return "";
    }
    return value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const resolveTypeLabel = (type: MondoFileType) => {
    const meta = resolveTypeMeta(type);
    if (meta?.name) {
      return meta.name;
    }
    return toTitleCase(type);
  };

  const resolveTypeIcon = (type: MondoFileType) => {
    const meta = resolveTypeMeta(type);
    return meta?.icon ?? "file-plus";
  };

  return (
    <Card
      icon="sun"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      actions={[
        {
          content: (
            <div className="flex-1 min-w-0">
              <QuickDailyEntry
                iconOnly
                onAdd={async (value) => {
                  await addEntry(value);
                  setVisible(5);
                }}
              />
            </div>
          ),
        },
      ]}
    >
      {isLoading ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          Loading daily entries...
        </Typography>
      ) : entries.length === 0 ? (
        <Typography variant="body" className="text-sm text-[var(--text-muted)]">
          No unchecked items in daily notes.
        </Typography>
      ) : (
        <Stack direction="column" gap={2} className="w-full">
          {visibleEntries.map((entry) => {
            const isBusy = Boolean(pending[entry.id]);
            const timestamp = entry.occurredAt ?? entry.noteDate;
            const hintPieces: string[] = [];
            if (entry.headingTitle) {
              hintPieces.push(entry.headingTitle);
            }
            if (entry.noteTitle) {
              hintPieces.push(entry.noteTitle);
            }
            const extraHint = hintPieces.length > 0 ? hintPieces.join(" • ") : null;
            const primaryType = convertTypeOptions[0];
            const secondaryTypes = primaryType
              ? convertTypeOptions.slice(1)
              : [];
            return (
              <div
                key={entry.id}
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
                        void handleComplete(entry.id);
                      }}
                      aria-label={`Complete daily entry "${entry.displayText}"`}
                    />
                    <Stack direction="column" gap={1} className="flex-1 min-w-0">
                      <div className="max-w-full overflow-x-auto">
                        <Link
                          to={entry.filePath}
                          className="block w-full whitespace-nowrap text-sm font-medium text-[var(--text-accent)] hover:underline"
                        >
                          {entry.displayText}
                        </Link>
                      </div>
                      <Typography
                        variant="body"
                        className="text-xs text-[var(--text-muted)]"
                      >
                        <ReadableDate
                          value={timestamp}
                          fallback="—"
                          extraHint={extraHint}
                        />
                        {entry.noteTitle && ` • ${entry.noteTitle}`}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap={1} className="shrink-0">
                    {primaryType ? (
                      <SplitButton
                        type="button"
                        className="text-xs px-2 py-1"
                        toggleClassName="text-xs px-1 py-1"
                        icon={resolveTypeIcon(primaryType)}
                        disabled={isBusy}
                        onClick={() => {
                          if (isBusy) return;
                          void handleConvert(entry.id, primaryType);
                        }}
                        menuAriaLabel="Choose note type for daily entry"
                        secondaryActions={secondaryTypes.map((type) => ({
                          label: resolveTypeLabel(type),
                          icon: resolveTypeIcon(type),
                          disabled: isBusy,
                          onSelect: () => {
                            if (isBusy) return;
                            void handleConvert(entry.id, type);
                          },
                        }))}
                      >
                        {resolveTypeLabel(primaryType)}
                      </SplitButton>
                    ) : (
                      <Button
                        type="button"
                        className="text-xs px-2 py-1"
                        disabled
                      >
                        convert
                      </Button>
                    )}
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
                aria-label="Load more daily entries"
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

type QuickDailyProps = {
  collapsed?: boolean;
  state?: QuickDailyState;
};

export const QuickDaily = ({ collapsed = false, state }: QuickDailyProps) => {
  if (state) {
    return <QuickDailyCard collapsed={collapsed} state={state} />;
  }

  const hookState = useQuickDailyEntries();
  return <QuickDailyCard collapsed={collapsed} state={hookState} />;
};

export default QuickDaily;
