import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";

type PeopleTableProps = {
  items: TCachedFile[];
};

const renderTeams = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): Array<{ path: string | null; label: string }> => {
  const rawTeams = entry.cache?.frontmatter?.team;
  const values: Array<string> = rawTeams
    ? Array.isArray(rawTeams)
      ? rawTeams.map((value) => String(value))
      : [String(rawTeams)]
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

const renderRoles = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): Array<{ path: string | null; label: string }> => {
  const frontmatter = entry.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!frontmatter) {
    return [];
  }

  const rawRoles = frontmatter.role ?? frontmatter.roles;
  const values: Array<string> = rawRoles
    ? Array.isArray(rawRoles)
      ? rawRoles.map((value) => String(value))
      : [String(rawRoles)]
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
 * Presentational table for people rows. Renders links for teams and roles using Obsidian metadata resolution.
 */
export const PeopleTable: React.FC<PeopleTableProps> = ({ items }) => {
  const app = useApp();

  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      renderRow={(entry) => {
        const label =
          entry.cache?.frontmatter?.name ??
          entry.file.basename ??
          entry.file.path;

        const teams = renderTeams(entry, app);
        const roles = renderRoles(entry, app);

        return (
          <>
            <Table.Cell className="px-2 py-2 align-top">
              <Button to={entry.file.path} variant="link">
                {label}
              </Button>
            </Table.Cell>
            <Table.Cell className="px-2 py-2 align-top text-xs text-[var(--text-muted)]">
              {teams.length > 0 ? (
                teams.map((team, index) => (
                  <React.Fragment key={`${team.label}-${index}`}>
                    {team.path ? (
                      <Button to={team.path} variant="link" className="text-xs">
                        {team.label}
                      </Button>
                    ) : (
                      <span className="text-xs">{team.label}</span>
                    )}
                    {index < teams.length - 1 ? ", " : null}
                  </React.Fragment>
                ))
              ) : (
                <span>—</span>
              )}
            </Table.Cell>
            <Table.Cell className="px-2 py-2 align-top text-xs text-[var(--text-muted)]">
              {roles.length > 0 ? (
                roles.map((role, index) => (
                  <React.Fragment key={`${role.label}-${index}`}>
                    {role.path ? (
                      <Button to={role.path} variant="link" className="text-xs">
                        {role.label}
                      </Button>
                    ) : (
                      <span className="text-xs">{role.label}</span>
                    )}
                    {index < roles.length - 1 ? ", " : null}
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

export default PeopleTable;
