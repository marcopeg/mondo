import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import Switch from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import { getCRMEntityConfig, type CRMFileType } from "@/types/CRMFileType";
import { useRelevantNotes } from "./useRelevantNotes";
import { useRecentCRMNotes } from "@/hooks/use-recent-crm-notes";

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

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export const RelevantNotes = ({ collapsed = false }: RelevantNotesProps) => {
  const [selectedType, setSelectedType] = useState<CRMFileType | null>(null);
  const [mode, setMode] = useState<NotesMode>("hits");
  const [hitsVisibleCount, setHitsVisibleCount] = useState(5);
  const [historyLimit, setHistoryLimit] = useState(5);
  const hitsNotes = useRelevantNotes(25);
  const { notes: historyNotes, hasMore: historyHasMore } = useRecentCRMNotes(
    historyLimit,
    selectedType
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS),
    []
  );

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

  const toggleFilter = useCallback((type: CRMFileType) => {
    setSelectedType((previous) => (previous === type ? null : type));
  }, []);

  const handleModeChange = useCallback((checked: boolean) => {
    setMode(checked ? "history" : "hits");
  }, []);

  const handleLoadMore = useCallback(() => {
    if (mode === "history") {
      setHistoryLimit((previous) => previous + 5);
      return;
    }
    setHitsVisibleCount((previous) => previous + 5);
  }, [mode]);

  const hasMore = mode === "history" ? historyHasMore : hitsHasMore;

  const filterButtons = useMemo(
    () =>
      CRM_ENTITY_CONFIG_LIST.map((config) => ({
        type: config.type,
        icon: config.icon,
        label: config.name,
      })),
    []
  );

  const emptyStateMessage =
    mode === "history"
      ? "No CRM notes found yet."
      : "No referenced notes found yet.";

  return (
    <Card
      title="Relevant Notes"
      icon="target"
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
    >
      <Stack direction="column" gap={3} className="w-full">
        <Stack className="gap-2 flex-col sm:flex-row sm:items-center sm:justify-between -mt-2 -mx-2 px-2">
          <div className="-mx-2 flex-1 overflow-x-auto pb-1 sm:mx-0">
            <ButtonGroup className="crm-relevant-notes__filters-group flex-nowrap sm:mx-1">
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
          <Switch
            checked={mode === "history"}
            onCheckedChange={handleModeChange}
            uncheckedLabel="hits"
            checkedLabel="history"
            aria-label="Toggle relevant notes mode"
            className="flex-shrink-0 self-end sm:self-auto"
          />
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
              const config = getCRMEntityConfig(note.type);
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
                    Last updated {dateFormatter.format(note.modified)}
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
                ? getCRMEntityConfig(note.type)?.name ?? note.type
                : "note";
              const totalReferences = getTotalHits(note);
              const lastOpened = formatDateForDisplay(note.lastOpened);
              const lastModified = formatDateForDisplay(
                note.lastModified ?? note.lastCreated
              );

              const metadataParts: string[] = [
                formatReferenceCount(totalReferences),
              ];

              if (lastOpened && lastModified && lastOpened === lastModified) {
                metadataParts.push(`last opened ${lastOpened}`);
              } else {
                metadataParts.push(
                  lastOpened ? `last opened ${lastOpened}` : "last opened —"
                );
                metadataParts.push(
                  lastModified
                    ? `last modified ${lastModified}`
                    : "last modified —"
                );
              }

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
                    {metadataParts.join(", ")}
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
