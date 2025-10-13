import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";

type GearTableProps = {
  items: TCachedFile[];
};

const resolveLink = (
  raw: string,
  app: ReturnType<typeof useApp>,
  sourcePath: string
) => {
  let value = raw.trim();
  if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
  }
  value = value.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();

  const dest = app.metadataCache.getFirstLinkpathDest(value, sourcePath);
  if (dest && (dest as any).path) {
    return {
      path: (dest as any).path as string,
      label: ((dest as any).basename as string) ?? value,
    };
  }

  const abs = app.vault.getAbstractFileByPath(value) as any;
  if (abs && abs.path) {
    return { path: abs.path as string, label: (abs.basename as string) ?? value };
  }

  const absWithExt = app.vault.getAbstractFileByPath(`${value}.md`) as any;
  if (absWithExt && absWithExt.path) {
    return {
      path: absWithExt.path as string,
      label: (absWithExt.basename as string) ?? value,
    };
  }

  return { path: null, label: value };
};

export const GearTable = ({ items }: GearTableProps) => {
  const app = useApp();

  return (
    <Table>
      <tbody>
        {items.map((entry) => {
          const label =
            entry.cache?.frontmatter?.show ??
            entry.cache?.frontmatter?.name ??
            entry.file.basename;

          const rawOwners =
            entry.cache?.frontmatter?.owner ??
            entry.cache?.frontmatter?.owners ??
            [];

          const ownerValues = Array.isArray(rawOwners)
            ? rawOwners.map((v) => String(v))
            : rawOwners
            ? [String(rawOwners)]
            : [];

          const resolvedOwners = ownerValues
            .map((raw) => resolveLink(raw, app, entry.file.path))
            .filter(Boolean) as Array<{ path: string | null; label: string }>;

          return (
            <Table.Row key={entry.file.path}>
              <Table.Cell>
                <Button to={entry.file.path} variant="link">
                  {label}
                </Button>
              </Table.Cell>
              <Table.Cell>
                {resolvedOwners.length > 0 ? (
                  resolvedOwners.map((owner, index) => (
                    <React.Fragment key={`${owner.label}-${index}`}>
                      {owner.path ? (
                        <Button to={owner.path} variant="link">
                          {owner.label}
                        </Button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>
                          {owner.label}
                        </span>
                      )}
                      {index < resolvedOwners.length - 1 ? ", " : null}
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

export default GearTable;
