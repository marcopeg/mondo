import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";

type MeetingsTableProps = {
  items: TCachedFile[];
  emptyLabel?: React.ReactNode;
};

const resolveParticipants = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): Array<{ path: string | null; label: string }> => {
  const rawParticipants = entry.cache?.frontmatter?.participants;
  const values: Array<string> = rawParticipants
    ? Array.isArray(rawParticipants)
      ? rawParticipants.map((value) => String(value))
      : [String(rawParticipants)]
    : [];

  return values
    .map((raw) => {
      if (!raw) return null;
      let value = String(raw).trim();
      if (value.startsWith("[[") && value.endsWith("]]")) {
        value = value.slice(2, -2);
      }
      value = value.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();

      const destination = app.metadataCache.getFirstLinkpathDest(
        value,
        entry.file.path
      );
      if (destination && (destination as any).path) {
        return {
          path: (destination as any).path as string,
          label: ((destination as any).basename as string) ?? value,
        };
      }

      const absolute = app.vault.getAbstractFileByPath(value) as any;
      if (absolute && absolute.path) {
        return { path: absolute.path as string, label: absolute.basename ?? value };
      }

      const absoluteWithExtension = app.vault.getAbstractFileByPath(
        `${value}.md`
      ) as any;
      if (absoluteWithExtension && absoluteWithExtension.path) {
        return {
          path: absoluteWithExtension.path as string,
          label: absoluteWithExtension.basename ?? value,
        };
      }

      return { path: null, label: value };
    })
    .filter(Boolean) as Array<{ path: string | null; label: string }>;
};

/**
 * Presentational table for meeting rows with Obsidian link resolution for participants.
 */
export const MeetingsTable: React.FC<MeetingsTableProps> = ({
  items,
  emptyLabel,
}) => {
  const app = useApp();

  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      emptyLabel={emptyLabel}
      renderRow={(entry) => {
        const label =
          entry.cache?.frontmatter?.title ??
          entry.cache?.frontmatter?.name ??
          entry.file.basename ??
          entry.file.path;
        const displayDate =
          entry.cache?.frontmatter?.date ??
          entry.cache?.frontmatter?.datetime;

        const participants = resolveParticipants(entry, app);

        return (
          <>
            <Table.Cell className="px-2 py-2 align-top">
              <Button to={entry.file.path} variant="link">
                {label}
              </Button>
              {displayDate ? (
                <div className="text-xs text-[var(--text-muted)]">{String(displayDate)}</div>
              ) : null}
            </Table.Cell>
            <Table.Cell className="px-2 py-2 align-top text-xs text-[var(--text-muted)]">
              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <React.Fragment key={`${participant.label}-${index}`}>
                    {participant.path ? (
                      <Button
                        to={participant.path}
                        variant="link"
                        className="text-xs"
                      >
                        {participant.label}
                      </Button>
                    ) : (
                      <span className="text-xs">{participant.label}</span>
                    )}
                    {index < participants.length - 1 ? ", " : null}
                  </React.Fragment>
                ))
              ) : (
                <span>—</span>
              )}
            </Table.Cell>
          </>
        );
      }}
    />
  );
};

export default MeetingsTable;
