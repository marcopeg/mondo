import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";

type ProjectsTableProps = {
  items: TCachedFile[];
};

/**
 * Simple presentational table for projects. Shows project name and optionally a small subtitle if available.
 */
export const ProjectsTable: React.FC<ProjectsTableProps> = ({ items }) => {
  return (
    <Table>
      <tbody>
        {items.length > 0 ? (
          items.map((entry) => {
            const label =
              entry.cache?.frontmatter?.name ??
              entry.file.basename ??
              entry.file.path;
            const subtitle =
              entry.cache?.frontmatter?.subtitle ??
              entry.cache?.frontmatter?.description;

            return (
              <Table.Row key={entry.file.path}>
                <Table.Cell>
                  <Button to={entry.file.path} variant="link">
                    {label}
                  </Button>
                  {subtitle ? (
                    <div
                      style={{ color: "var(--text-muted)", fontSize: "0.9em" }}
                    >
                      {subtitle}
                    </div>
                  ) : null}
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

export default ProjectsTable;
