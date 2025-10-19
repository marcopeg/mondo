import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import {
  getProjectDisplayLabel,
  getProjectDisplaySubtitle,
} from "@/utils/getProjectDisplayInfo";

type ProjectsTableProps = {
  items: TCachedFile[];
  sortable?: boolean;
  onReorder?: (items: TCachedFile[]) => void;
  getSortableId?: (item: TCachedFile, index: number) => React.Key;
};

/**
 * Simple presentational table for projects. Shows project name and optional subtitle.
 */
export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  items,
  sortable = false,
  onReorder,
  getSortableId,
}) => {
  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      sortable={sortable}
      onReorder={onReorder}
      getSortableId={getSortableId}
      renderRow={(entry) => {
        const label = getProjectDisplayLabel(entry);
        const subtitle = getProjectDisplaySubtitle(entry);

        return (
          <Table.Cell className="px-2 py-2 align-top">
            <Button to={entry.file.path} variant="link">
              {label}
            </Button>
            {subtitle ? (
              <div className="text-xs text-[var(--text-muted)]">{subtitle}</div>
            ) : null}
          </Table.Cell>
        );
      }}
    />
  );
};

export default ProjectsTable;
