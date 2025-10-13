import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { useRecentCRMNotes } from "@/hooks/use-recent-crm-notes";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getCRMEntityConfig } from "@/types/CRMFileType";

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const useDateFormatter = () =>
  useMemo(
    () => new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS),
    []
  );

export const RecentCRMNotes = () => {
  const [limit, setLimit] = useState(5);
  const { notes, hasMore } = useRecentCRMNotes(limit);
  const formatter = useDateFormatter();

  return (
    <Card
      title="Recently updated CRM notes"
      spacing={3}
      collapsible
      collapsed
    >
      {notes.length === 0 ? (
        <Typography
          variant="body"
          className="text-sm text-[var(--text-muted)]"
        >
          No CRM notes found yet.
        </Typography>
      ) : (
        <Stack direction="column" gap={3} className="w-full">
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
            <Button
              onClick={() => {
                setLimit((prev) => prev + 5);
              }}
              className="self-start text-xs px-3 py-1"
              type="button"
            >
              Load more
            </Button>
          )}
        </Stack>
      )}
    </Card>
  );
};
