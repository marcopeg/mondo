import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import { getCRMEntityConfig, type CRMFileType } from "@/types/CRMFileType";
import { useRelevantNotes } from "./useRelevantNotes";

const formatCount = (count: number): string => {
  if (count === 1) {
    return "Referenced 1 time";
  }
  return `Referenced ${count} times`;
};

export const RelevantNotes = () => {
  const [selectedType, setSelectedType] = useState<CRMFileType | null>(null);
  const notes = useRelevantNotes(10);

  const filteredNotes = useMemo(
    () =>
      selectedType
        ? notes.filter((note) => note.type === selectedType)
        : notes,
    [notes, selectedType]
  );

  const toggleFilter = useCallback((type: CRMFileType) => {
    setSelectedType((previous) => (previous === type ? null : type));
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
        <div className="-mx-1 overflow-x-auto pb-1">
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
        {filteredNotes.length === 0 ? (
          <Typography
            variant="body"
            className="text-sm text-[var(--text-muted)]"
          >
            No referenced notes found yet.
          </Typography>
        ) : (
          <>
            {filteredNotes.map((note) => {
              const entityName = note.type
                ? getCRMEntityConfig(note.type)?.name ?? note.type
                : "note";
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
                    {formatCount(note.count)}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </Stack>
    </Card>
  );
};

export default RelevantNotes;
