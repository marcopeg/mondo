import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";
import { useApp } from "@/hooks/use-app";

type MeetingsTableProps = {
  items: TCachedFile[];
};

/**
 * Presentational table for meeting rows. Accepts resolved items and the Obsidian app
 * to allow local link resolution for participants.
 */
export const MeetingsTable: React.FC<MeetingsTableProps> = ({ items }) => {
  const app = useApp();
  return (
    <Table>
      <tbody>
        {items.map((entry) => {
          const label =
            entry.cache?.frontmatter?.title ??
            entry.cache?.frontmatter?.name ??
            entry.file.basename ??
            entry.file.path;

          const rawParticipants = entry.cache?.frontmatter?.participants;
          const participantValues: Array<string> = rawParticipants
            ? Array.isArray(rawParticipants)
              ? rawParticipants.map((v) => String(v))
              : [String(rawParticipants)]
            : [];

          const resolvedParticipants = participantValues
            .map((raw) => {
              if (!raw) return null;
              let s = String(raw).trim();
              if (s.startsWith("[[") && s.endsWith("]]")) s = s.slice(2, -2);
              s = s.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();

              const dest = app.metadataCache.getFirstLinkpathDest(
                s,
                entry.file.path
              );
              if (dest && (dest as any).path)
                return {
                  path: (dest as any).path,
                  label: (dest as any).basename ?? s,
                };

              const abs = app.vault.getAbstractFileByPath(s) as any;
              if (abs && abs.path)
                return { path: abs.path, label: abs.basename ?? s };

              const abs2 = app.vault.getAbstractFileByPath(s + ".md") as any;
              if (abs2 && abs2.path)
                return { path: abs2.path, label: abs2.basename ?? s };

              return { path: null, label: s };
            })
            .filter(Boolean) as Array<{ path: string | null; label: string }>;

          const date =
            entry.cache?.frontmatter?.date ??
            entry.cache?.frontmatter?.datetime;

          return (
            <Table.Row key={entry.file.path}>
              <Table.Cell>
                <Button to={entry.file.path} variant="link">
                  {label}
                </Button>
                {date ? (
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.9em" }}
                  >
                    {String(date)}
                  </div>
                ) : null}
              </Table.Cell>
              <Table.Cell>
                {resolvedParticipants.length > 0 ? (
                  resolvedParticipants.map((p, i) => (
                    <React.Fragment key={p.label + i}>
                      {p.path ? (
                        <Button
                          to={p.path}
                          variant="link"
                          className="participant-link"
                        >
                          {p.label}
                        </Button>
                      ) : (
                        <span
                          className="participant-link"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {p.label}
                        </span>
                      )}
                      {i < resolvedParticipants.length - 1 ? ", " : null}
                    </React.Fragment>
                  ))
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </tbody>
    </Table>
  );
};

export default MeetingsTable;
