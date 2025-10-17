import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";

type CompaniesTableProps = {
  items: TCachedFile[];
};

/**
 * Simple presentational table for companies. Shows a single column with a link to the company file.
 */
export const CompaniesTable: React.FC<CompaniesTableProps> = ({ items }) => {
  return (
    <Table>
      <tbody>
        {items.length > 0 ? (
          items.map((entry) => {
            const label =
              (entry.cache?.frontmatter?.show as string | undefined) ??
              (entry.cache?.frontmatter?.name as string | undefined) ??
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

export default CompaniesTable;
