import type { RefObject } from "react";
import { useMemo } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import { isMondoEntityType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { KnownEntityHeader } from "./KnownEntityHeader";
import { UnknownEntityHeader } from "./UnknownEntityHeader";

const buildHeaderLabel = (entityType: MondoEntityType | null) => {
  if (!entityType) {
    return "Unknown note";
  }

  const config = MONDO_ENTITIES[entityType];
  return config?.name ?? entityType;
};

type EntityHeaderProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  type: string | null;
};

export const EntityHeader = ({ containerRef, type }: EntityHeaderProps) => {
  const { file } = useEntityFile();
  const app = useApp();

  const entityType = useMemo(() => {
    if (!type) {
      return null;
    }

    return isMondoEntityType(type) ? (type as MondoEntityType) : null;
  }, [type]);

  const label = useMemo(() => buildHeaderLabel(entityType), [entityType]);

  const headerClasses = [
    "flex items-center justify-between gap-3",
    "rounded-md border border-[var(--background-modifier-border)]",
    "bg-[var(--background-secondary)] px-3 py-2",
  ].join(" ");

  const fileRef = file as TCachedFile | undefined;

  return (
    <div className={headerClasses}>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Mondo Note
        </span>
        <span className="text-sm font-medium text-[var(--text-normal)]">{label}</span>
      </div>
      {entityType ? (
        <KnownEntityHeader
          containerRef={containerRef}
          entityType={entityType}
        />
      ) : (
        <UnknownEntityHeader app={app} file={fileRef} />
      )}
    </div>
  );
};

export default EntityHeader;
