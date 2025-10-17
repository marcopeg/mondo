import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";

type ProjectsTableProps = {
  items: TCachedFile[];
};

/**
 * Simple presentational table for projects. Shows project name and optional subtitle.
 */
export const ProjectsTable: React.FC<ProjectsTableProps> = ({ items }) => {
  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      renderRow={(entry) => {
        const label =
          entry.cache?.frontmatter?.name ??
          entry.file.basename ??
          entry.file.path;
        const subtitle =
          entry.cache?.frontmatter?.subtitle ??
          entry.cache?.frontmatter?.description;

        return (
          <Table.Cell className="px-2 py-2 align-top">
            <Button to={entry.file.path} variant="link">
              {label}
            </Button>
            {subtitle ? (
              <div className="text-xs text-[var(--text-muted)]">{String(subtitle)}</div>
            ) : null}
          </Table.Cell>
        );
      }}
    />
  );
};

export default ProjectsTable;
