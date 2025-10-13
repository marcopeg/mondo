import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";
import { useApp } from "@/hooks/use-app";

type PeopleTableProps = {
  items: TCachedFile[];
};

/**
 * Presentational table for people rows. Accepts resolved items and the Obsidian app
 * to allow local link resolution for teams.
 */
export const PeopleTable: React.FC<PeopleTableProps> = ({ items }) => {
  const app = useApp();
  return (
    <Table>
      <tbody>
        {items.map((entry) => {
          const label =
            entry.cache?.frontmatter?.name ??
            entry.file.basename ??
            entry.file.path;

          const rawTeams = entry.cache?.frontmatter?.team;
          const teamValues: Array<string> = rawTeams
            ? Array.isArray(rawTeams)
              ? rawTeams.map((v) => String(v))
              : [String(rawTeams)]
            : [];

          const resolvedTeams = teamValues
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

          return (
            <Table.Row key={entry.file.path}>
              <Table.Cell>
                <Button to={entry.file.path} variant="link">
                  {label}
                </Button>
              </Table.Cell>
              <Table.Cell>
                {resolvedTeams.length > 0 ? (
                  resolvedTeams.map((t, i) => (
                    <React.Fragment key={t.label + i}>
                      {t.path ? (
                        <Button
                          to={t.path}
                          variant="link"
                          className="team-link"
                        >
                          {t.label}
                        </Button>
                      ) : (
                        <span
                          className="team-link"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t.label}
                        </span>
                      )}
                      {i < resolvedTeams.length - 1 ? ", " : null}
                    </React.Fragment>
                  ))
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </Table.Cell>
              <Table.Cell>
                {/* roles: support `role` or `roles` frontmatter, same resolution as teams */}
                {(() => {
                  const rawRoles =
                    entry.cache?.frontmatter?.role ??
                    entry.cache?.frontmatter?.roles;
                  const roleValues: Array<string> = rawRoles
                    ? Array.isArray(rawRoles)
                      ? rawRoles.map((v) => String(v))
                      : [String(rawRoles)]
                    : [];

                  const resolvedRoles = roleValues
                    .map((raw) => {
                      if (!raw) return null;
                      let s = String(raw).trim();
                      if (s.startsWith("[[") && s.endsWith("]]"))
                        s = s.slice(2, -2);
                      s = s
                        .split("|")[0]
                        .split("#")[0]
                        .replace(/\.md$/i, "")
                        .trim();

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

                      const abs2 = app.vault.getAbstractFileByPath(
                        s + ".md"
                      ) as any;
                      if (abs2 && abs2.path)
                        return { path: abs2.path, label: abs2.basename ?? s };

                      return { path: null, label: s };
                    })
                    .filter(Boolean) as Array<{
                    path: string | null;
                    label: string;
                  }>;

                  return resolvedRoles.length > 0 ? (
                    resolvedRoles.map((r, i) => (
                      <React.Fragment key={r.label + i}>
                        {r.path ? (
                          <Button
                            to={r.path}
                            variant="link"
                            className="role-link"
                          >
                            {r.label}
                          </Button>
                        ) : (
                          <span
                            className="role-link"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {r.label}
                          </span>
                        )}
                        {i < resolvedRoles.length - 1 ? ", " : null}
                      </React.Fragment>
                    ))
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  );
                })()}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </tbody>
    </Table>
  );
};

export default PeopleTable;
