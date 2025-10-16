import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { createOrOpenEntity } from "@/utils/createOrOpenEntity";
import { useCRMEntityPanel } from "./useCRMEntityPanel";
import { EntityGrid } from "./components/EntityGrid";

const formatEntityLabel = (value: string): string => {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "Entity";
  }

  return normalized
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

type CRMEntityPanelViewProps = {
  entityType: CRMFileType;
};

export const CRMEntityPanelView: FC<CRMEntityPanelViewProps> = ({ entityType }) => {
  const { columns, rows } = useCRMEntityPanel(entityType);
  const config = getCRMEntityConfig(entityType);
  const title = config?.name ?? entityType;
  const helper = config?.dashboard.helper ?? "";
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const entityLabel = useMemo(
    () => formatEntityLabel(config?.type ?? entityType),
    [config?.type, entityType]
  );
  const buttonLabel = useMemo(
    () => `+ New ${entityLabel}`,
    [entityLabel]
  );
  const handleCreateClick = useCallback(async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      await createOrOpenEntity({
        app,
        entityType,
        title: "Untitled",
        createNewIfExists: true,
      });
    } catch (error) {
      console.error("CRMEntityPanelView: failed to create entity", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, entityType, isCreating]);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{title}</h1>
          {helper && (
            <span className="text-xs text-[var(--text-muted)]">{helper}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCreateClick}
            disabled={isCreating}
          >
            {buttonLabel}
          </Button>
          <span className="text-sm text-[var(--text-muted)]">
            {rows.length} files
          </span>
        </div>
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
