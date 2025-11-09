import {
  type MondoEntityListRow,
  type MondoEntityListColumn,
} from "@/views/entity-panel-view/useEntityPanels";
import { ColumnValue } from "./ColumnValue";

type EntityGridProps = {
  columns: MondoEntityListColumn[];
  rows: MondoEntityListRow[];
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
            {columns.map((column) => {
              const isCover = column.type === "cover";
              const headerClass = isCover
                ? "border-b border-[var(--background-modifier-border)] w-16 min-w-[4rem] max-w-[4rem] p-0 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                : "border-b border-[var(--background-modifier-border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";
              return (
                <th key={column.key} className={headerClass}>
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.path}
              className="odd:bg-[var(--background-primary-alt)] even:bg-[var(--background-primary)]"
            >
              {columns.map((column) => {
                const isCover = column.type === "cover";
                return (
                  <td
                    key={`${row.path}-${column.key}`}
                    className={`border-t border-[var(--background-modifier-border)] text-sm text-[var(--text-normal)] ${
                      isCover
                        ? "w-16 min-w-[4rem] max-w-[4rem] p-0 align-middle"
                        : "px-3 py-2"
                    }`}
                  >
                    <ColumnValue column={column} row={row} />
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
