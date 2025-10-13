import type { FC } from "react";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { useCRMEntityPanel } from "./useCRMEntityPanel";
import { EntityGrid } from "./components/EntityGrid";

type CRMEntityPanelViewProps = {
  entityType: CRMFileType;
};

export const CRMEntityPanelView: FC<CRMEntityPanelViewProps> = ({ entityType }) => {
  const { columns, rows } = useCRMEntityPanel(entityType);
  const config = getCRMEntityConfig(entityType);
  const title = config?.name ?? entityType;
  const helper = config?.dashboard.helper ?? "";

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{title}</h1>
          {helper && (
            <span className="text-xs text-[var(--text-muted)]">{helper}</span>
          )}
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {rows.length} files
        </span>
      </header>
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
