import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import Switch from "@/components/ui/Switch";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import { getCRMEntityConfig, type CRMFileType } from "@/types/CRMFileType";
import { useRelevantNotes } from "./useRelevantNotes";

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

type NotesMode = "all" | "changed";

const countForMode = (
  note: ReturnType<typeof useRelevantNotes>[number],
  mode: NotesMode
): number => {
  const { created, modified, opened } = note.counts;
  if (mode === "all") {
    return created + modified + opened;
  }
  return created + modified;
};

export const RelevantNotes = () => {
  const [selectedType, setSelectedType] = useState<CRMFileType | null>(null);
  const [mode, setMode] = useState<NotesMode>("all");
  const [visibleCount, setVisibleCount] = useState(5);
  const notes = useRelevantNotes(10);

  const filteredNotes = useMemo(() => {
    const scoped = selectedType
      ? notes.filter((note) => note.type === selectedType)
      : notes;

    const relevant =
      mode === "changed"
        ? scoped.filter((note) => note.counts.created + note.counts.modified > 0)
        : scoped;

    const sorted = [...relevant];
    sorted.sort((left, right) => {
      const rightCount = countForMode(right, mode);
      const leftCount = countForMode(left, mode);
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }
      return left.label.localeCompare(right.label);
    });

    return sorted;
  }, [mode, notes, selectedType]);

  useEffect(() => {
    setVisibleCount(5);
  }, [mode, selectedType, notes]);

  const visibleNotes = useMemo(
    () => filteredNotes.slice(0, visibleCount),
    [filteredNotes, visibleCount]
  );

  const hasMore = filteredNotes.length > visibleCount;

  const toggleFilter = useCallback((type: CRMFileType) => {
    setSelectedType((previous) => (previous === type ? null : type));
  }, []);

  const handleModeChange = useCallback((checked: boolean) => {
    setMode(checked ? "changed" : "all");
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((previous) => previous + 5);
  }, []);

  const filterButtons = useMemo(
    () =>
      CRM_ENTITY_CONFIG_LIST.map((config) => ({
        type: config.type,
        icon: config.icon,
        label: config.name,
      })),
    []
  );

  return (
    <Card
      title="Relevant Notes"
      icon="target"
      collapsible
      collapsed
      collapseOnHeaderClick
    >
      <Stack direction="column" gap={3} className="w-full">
        <Stack align="center" justify="space-between" className="gap-2">
          <div className="-mx-1 flex-1 overflow-x-auto pb-1">
            <ButtonGroup className="mx-1 flex-nowrap">
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
            checked={mode === "changed"}
            onCheckedChange={handleModeChange}
            uncheckedLabel="all"
            checkedLabel="changed"
            aria-label="Toggle relevant notes mode"
            className="flex-shrink-0"
          />
        </Stack>
        {filteredNotes.length === 0 ? (
          <Typography
            variant="body"
            className="text-sm text-[var(--text-muted)]"
          >
            No referenced notes found yet.
          </Typography>
        ) : (
          <>
            {visibleNotes.map((note) => {
              const entityName = note.type
                ? getCRMEntityConfig(note.type)?.name ?? note.type
                : "note";
              const totalReferences = countForMode(note, mode);
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
              <div className="pt-1">
                <Button
                  onClick={handleLoadMore}
                  className="w-full justify-center"
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
