import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import Switch from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { ReadableDate } from "@/components/ui/ReadableDate";
import {
  MONDO_ENTITIES,
  MONDO_UI_CONFIG,
  type MondoEntityType,
} from "@/entities";
import { getMondoEntityConfig, type MondoFileType } from "@/types/MondoFileType";
import { useRelevantNotes } from "./useRelevantNotes";
import { useRecentMondoNotes } from "@/hooks/use-recent-mondo-notes";
import { useSetting } from "@/hooks/use-setting";
import { useApp } from "@/hooks/use-app";
import getMondoPlugin from "@/utils/getMondoPlugin";

const formatReferenceCount = (count: number): string => {
  if (count === 1) {
    return "references 1 time";
  }
  return `references ${count} times`;
};

const formatDateForDisplay = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return trimmed;
  }

  return new Date(parsed).toISOString().slice(0, 10);
};

type NotesMode = "hits" | "history";

type RelevantNotesProps = {
  collapsed?: boolean;
};

const getTotalHits = (note: ReturnType<typeof useRelevantNotes>[number]) =>
  note.counts.created + note.counts.modified + note.counts.opened;

export const RelevantNotes = ({ collapsed = false }: RelevantNotesProps) => {
  const app = useApp();
  const [selectedType, setSelectedType] = useState<MondoFileType | null>(null);
  const modeSetting = useSetting<NotesMode>(
    "dashboard.relevantNotesMode",
    "hits"
  );
  const sanitizedModeSetting: NotesMode =
    modeSetting === "history" ? "history" : "hits";
  const [mode, setMode] = useState<NotesMode>(sanitizedModeSetting);
  const [hitsVisibleCount, setHitsVisibleCount] = useState(5);
  const [historyLimit, setHistoryLimit] = useState(5);
  const hitsNotes = useRelevantNotes(25);
  const { notes: historyNotes, hasMore: historyHasMore } = useRecentMondoNotes(
    historyLimit,
    selectedType
  );
  useEffect(() => {
    setMode(sanitizedModeSetting);
  }, [sanitizedModeSetting]);
  const filteredHits = useMemo(() => {
    const scoped = selectedType
      ? hitsNotes.filter((note) => note.type === selectedType)
      : hitsNotes;

    const sorted = [...scoped];
    sorted.sort((left, right) => {
      const rightCount = getTotalHits(right);
      const leftCount = getTotalHits(left);
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }
      return left.label.localeCompare(right.label);
    });

    return sorted;
  }, [hitsNotes, selectedType]);

  const visibleHits = useMemo(
    () => filteredHits.slice(0, hitsVisibleCount),
    [filteredHits, hitsVisibleCount]
  );

  const hitsHasMore = filteredHits.length > hitsVisibleCount;

  useEffect(() => {
    setHitsVisibleCount(5);
    setHistoryLimit(5);
  }, [selectedType]);

  useEffect(() => {
    if (mode === "hits") {
      setHitsVisibleCount(5);
    } else {
      setHistoryLimit(5);
    }
  }, [mode]);

  const toggleFilter = useCallback((type: MondoFileType) => {
    setSelectedType((previous) => (previous === type ? null : type));
  }, []);

  const persistModeSetting = useCallback(
    async (nextMode: NotesMode) => {
      const plugin = getMondoPlugin(app);
      if (!plugin) {
        return;
      }

      const settings = plugin.settings ?? {};
      const dashboardSettings = settings.dashboard ?? {};
      if (dashboardSettings.relevantNotesMode === nextMode) {
        return;
      }

      plugin.settings = {
        ...settings,
        dashboard: {
          ...dashboardSettings,
          relevantNotesMode: nextMode,
        },
      };

      try {
        await plugin.saveSettings?.();
      } catch (error) {
        console.debug(
          "RelevantNotes: failed to persist mode setting",
          error
        );
      }

      try {
        window.dispatchEvent(new CustomEvent("mondo:settings-updated"));
      } catch (error) {
        console.debug(
          "RelevantNotes: failed to dispatch settings update event",
          error
        );
      }
    },
    [app]
  );

  const handleModeChange = useCallback(
    (checked: boolean) => {
      const nextMode: NotesMode = checked ? "history" : "hits";
      setMode(nextMode);
      void persistModeSetting(nextMode);
    },
    [persistModeSetting]
  );

  const handleLoadMore = useCallback(() => {
    if (mode === "history") {
      setHistoryLimit((previous) => previous + 5);
      return;
    }
    setHitsVisibleCount((previous) => previous + 5);
  }, [mode]);

  const hasMore = mode === "history" ? historyHasMore : hitsHasMore;

  const filterButtons = useMemo(() => {
    return MONDO_UI_CONFIG.relevantNotes.filter.order
      .map((type) => {
        const config = MONDO_ENTITIES[type];
        if (!config) {
          return null;
        }
        return {
          type,
          icon: config.icon,
          label: config.name,
        };
      })
      .filter(Boolean) as Array<{
      type: MondoEntityType;
      icon: string;
      label: string;
    }>;
  }, []);

  const emptyStateMessage =
    mode === "history"
      ? "No Mondo notes found yet."
      : "No referenced notes found yet.";

  return (
    <Card
      title="Relevant Notes"
      icon="target"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      actions={[
        {
          key: "mode-toggle",
          content: (
            <Switch
              checked={mode === "history"}
              onCheckedChange={handleModeChange}
              uncheckedLabel="hits"
              checkedLabel="history"
              aria-label="Toggle relevant notes mode"
            />
          ),
        },
      ]}
    >
      <Stack direction="column" gap={3} className="w-full">
        <Stack className="gap-2 flex-col sm:flex-row sm:items-center sm:justify-between -mt-2 -mx-2 px-2">
          <div className="-mx-2 flex-1 overflow-x-auto pb-1">
            <ButtonGroup className="mondo-relevant-notes__filters-group flex-nowrap mx-0">
              {filterButtons.map((button) => {
                const isActive = selectedType === button.type;
                return (
                  <Button
                    key={button.type}
                    icon={button.icon}
                    aria-label={`Filter by ${button.label}`}
                    title={`Filter by ${button.label}`}
                    pressed={isActive}
                    onClick={() => toggleFilter(button.type)}
                    className="h-8 min-w-[2.5rem] justify-center px-3"
                  >
                    <span className="sr-only">{button.label}</span>
                  </Button>
                );
              })}
            </ButtonGroup>
          </div>
        </Stack>
        {(
          mode === "history"
            ? historyNotes.length === 0
            : filteredHits.length === 0
        ) ? (
          <Typography
            variant="body"
            className="text-sm text-[var(--text-muted)]"
          >
            {emptyStateMessage}
          </Typography>
        ) : mode === "history" ? (
          <>
            {historyNotes.map((note) => {
              const config = getMondoEntityConfig(note.type);
              const entityName = config?.name ?? note.type;
              const iconName = config?.icon;
              return (
                <div
                  key={note.path}
                  className="flex flex-col gap-1 rounded-sm border border-transparent p-2 hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]"
                >
                  <Stack direction="row" align="center" justify="space-between">
                    <Stack direction="row" align="center" gap={1}>
                      {iconName && <Icon name={iconName} />}
                      <Link
                        to={note.path}
                        className="text-sm font-medium text-[var(--text-accent)] hover:underline"
                      >
                        {note.label}
                      </Link>
                    </Stack>
                    <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      {entityName}
                    </span>
                  </Stack>
                  <span className="text-xs text-[var(--text-muted)]">
                    Last updated {" "}
                    <ReadableDate value={note.modified} fallback="—" />
                  </span>
                </div>
              );
            })}
            {hasMore ? (
              <div className="flex w-full flex-col gap-2 pt-1">
                <Separator />
                <Button
                  onClick={handleLoadMore}
                  className="text-xs px-2 py-2"
                  type="button"
                  variant="link"
                  fullWidth
                  aria-label="Load more history notes"
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {visibleHits.map((note) => {
              const entityName = note.type
                ? getMondoEntityConfig(note.type)?.name ?? note.type
                : "note";
              const totalReferences = getTotalHits(note);
              const lastOpened = formatDateForDisplay(note.lastOpened);
              const lastModified = formatDateForDisplay(
                note.lastModified ?? note.lastCreated
              );

              const metadataItems: ReactNode[] = [
                <span key="references">{formatReferenceCount(totalReferences)}</span>,
              ];

              if (lastOpened && lastModified && lastOpened === lastModified) {
                metadataItems.push(
                  <span key="opened">
                    last opened {" "}
                    <ReadableDate
                      value={note.lastOpened ?? note.lastModified ?? note.lastCreated}
                      fallback="—"
                    />
                  </span>
                );
              } else {
                metadataItems.push(
                  <span key="opened">
                    last opened {" "}
                    <ReadableDate value={note.lastOpened} fallback="—" />
                  </span>
                );
                metadataItems.push(
                  <span key="modified">
                    last modified {" "}
                    <ReadableDate
                      value={note.lastModified ?? note.lastCreated}
                      fallback="—"
                    />
                  </span>
                );
              }

              const metadataContent = metadataItems.flatMap((item, index) =>
                index === 0
                  ? [item]
                  : [
                      <span key={`sep-${index}`}>, </span>,
                      item,
                    ]
              );

              return (
                <div
                  key={note.path}
                  className="flex flex-col gap-1 rounded-sm border border-transparent p-2 hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]"
                >
                  <Stack direction="row" align="center" justify="space-between">
                    <Stack direction="row" align="center" gap={1}>
                      <Icon name={note.icon} />
                      <Link
                        to={note.path}
                        className="text-sm font-medium text-[var(--text-accent)] hover:underline"
                      >
                        {note.label}
                      </Link>
                    </Stack>
                    <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      {entityName}
                    </span>
                  </Stack>
                  <span className="text-xs text-[var(--text-muted)]">
                    {metadataContent}
                  </span>
                </div>
              );
            })}
            {hasMore ? (
              <div className="flex w-full flex-col gap-2 pt-1">
                <Separator />
                <Button
                  onClick={handleLoadMore}
                  className="text-xs px-2 py-2"
                  type="button"
                  variant="link"
                  fullWidth
                  aria-label="Load more relevant notes"
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Stack>
    </Card>
  );
};

export default RelevantNotes;
