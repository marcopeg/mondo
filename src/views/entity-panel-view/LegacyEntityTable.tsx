import type { FC } from "react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { CRMEntityListRow } from "./useEntityPanels";
import { EntityGrid } from "./components/EntityGrid";

type LegacyEntityTableProps = {
  hidden?: boolean;
  columns: string[];
  rows: CRMEntityListRow[];
};

export const LegacyEntityTable: FC<LegacyEntityTableProps> = ({
  hidden,
  columns,
  rows,
}) => {
  const style = useMemo<CSSProperties>(
    () => ({ display: hidden ? "none" : undefined }),
    [hidden]
  );

  return (
    <div style={style} className="h-full flex-1">
      {rows.length === 0 ? (
        <div className="text-sm text-[var(--text-muted)]">
          No files found for this type yet.
        </div>
      ) : (
        <EntityGrid columns={columns} rows={rows} />
      )}
    </div>
  );
};
