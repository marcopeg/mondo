import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";

type TeamsTableProps = {
  items: TCachedFile[];
};

/**
 * Simple presentational table for teams. Shows only a single column with a link to the team file.
 */
export const TeamsTable: React.FC<TeamsTableProps> = ({ items }) => {
  return (
    <Table>
      <tbody>
        {items.length > 0 ? (
          items.map((entry) => {
            const label =
              entry.cache?.frontmatter?.name ??
              entry.file.basename ??
              entry.file.path;

            return (
              <Table.Row key={entry.file.path}>
                <Table.Cell>
                  <Button to={entry.file.path} variant="link">
                    {label}
                  </Button>
                </Table.Cell>
              </Table.Row>
            );
          })
        ) : (
          <Table.Row>
            <Table.Cell>
              <span style={{ color: "var(--text-muted)" }}>—</span>
            </Table.Cell>
          </Table.Row>
        )}
      </tbody>
    </Table>
  );
};

export default TeamsTable;
