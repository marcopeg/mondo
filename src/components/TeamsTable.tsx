import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";

type TeamsTableProps = {
  items: TCachedFile[];
};

/**
 * Simple presentational table for teams.
 */
export const TeamsTable: React.FC<TeamsTableProps> = ({ items }) => {
  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      renderRow={(entry) => {
        const label =
          entry.cache?.frontmatter?.name ??
          entry.file.basename ??
          entry.file.path;

        return (
          <Table.Cell className="px-2 py-2 align-top">
            <Button to={entry.file.path} variant="link">
              {label}
            </Button>
          </Table.Cell>
        );
      }}
    />
  );
};

export default TeamsTable;
