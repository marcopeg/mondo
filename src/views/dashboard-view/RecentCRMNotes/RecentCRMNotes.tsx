import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { useRecentCRMNotes } from "@/hooks/use-recent-crm-notes";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import ButtonGroup from "@/components/ui/ButtonGroup";
import { getCRMEntityConfig, type CRMFileType } from "@/types/CRMFileType";
import { Separator } from "@/components/ui/Separator";

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const useDateFormatter = () =>
  useMemo(() => new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS), []);

export const RecentNotes = () => {
  const [limit, setLimit] = useState(5);
  const [selectedType, setSelectedType] = useState<CRMFileType | null>(null);
  const { notes, hasMore } = useRecentCRMNotes(limit, selectedType);
  const formatter = useDateFormatter();
  const toggleFilter = useCallback((type: CRMFileType) => {
    setSelectedType((prev) => (prev === type ? null : type));
    setLimit(5);
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
      title="Last Updates"
      icon="clock"
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
        {notes.length === 0 ? (
          <Typography
            variant="body"
            className="text-sm text-[var(--text-muted)]"
          >
            No CRM notes found yet.
          </Typography>
        ) : (
          <>
            {notes.map((note) => {
              const iconName = getCRMEntityConfig(note.type)?.icon;
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
                      {note.type}
                    </span>
                  </Stack>
                  <span className="text-xs text-[var(--text-muted)]">
                    Last updated {formatter.format(note.modified)}
                  </span>
                </div>
              );
            })}
            {hasMore && (
              <div className="flex w-full flex-col gap-2">
                <Separator />
                <Button
                  onClick={() => {
                    setLimit((prev) => prev + 5);
                  }}
                  className="text-xs px-2 py-2"
                  type="button"
                  variant="link"
                  fullWidth
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
};
