import {
  getDisplayValue,
  type CRMEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import {
  EntityCell,
  EntityCoverCell,
  EntityDateCell,
  EntityLinksCell,
  EntityTitleCell,
} from "./cells";

const TITLE_COLUMNS = new Set(["show", "filename", "fileName", "title"]);
const LINK_COLUMNS = new Set([
  "company",
  "location",
  "team",
  "role",
  "owner",
  "participants",
]);
const COVER_COLUMNS = new Set(["cover", "thumbnail", "image"]);

const formatColumnLabel = (column: string): string =>
  column
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type EntityGridProps = {
  columns: string[];
  rows: CRMEntityListRow[];
};

const getCellRenderer = (column: string) => {
  const normalized = column.toLowerCase();

  if (TITLE_COLUMNS.has(normalized)) {
    return EntityTitleCell;
  }

  if (normalized === "date") {
    return EntityDateCell;
  }

  if (normalized === "date_time" || normalized === "datetime") {
    return EntityDateCell;
  }

  if (COVER_COLUMNS.has(normalized)) {
    return EntityCoverCell;
  }

  if (LINK_COLUMNS.has(normalized)) {
    return EntityLinksCell;
  }

  if (normalized.endsWith("date")) {
    return EntityDateCell;
  }

  return EntityCell;
};

export const EntityGrid = ({ columns, rows }: EntityGridProps) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto border border-[var(--background-modifier-border)]">
        <thead>
          <tr className="bg-[var(--background-secondary)]">
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-[var(--background-modifier-border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {formatColumnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.path}
              className="odd:bg-[var(--background-primary-alt)] even:bg-[var(--background-primary)]"
            >
              {columns.map((column) => {
                const CellComponent = getCellRenderer(column);
                const value = getDisplayValue(row, column);
                return (
                  <td
                    key={`${row.path}-${column}`}
                    className={`border-t border-[var(--background-modifier-border)] text-sm text-[var(--text-normal)] ${
                      COVER_COLUMNS.has(column.toLowerCase())
                        ? "p-0"
                        : "px-3 py-2"
                    }`}
                  >
                    <CellComponent row={row} column={column} value={value} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
