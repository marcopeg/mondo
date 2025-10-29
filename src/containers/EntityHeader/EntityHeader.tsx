import type { RefObject } from "react";
import { useCallback, useMemo } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import { isMondoEntityType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { KnownEntityHeader } from "./KnownEntityHeader";
import { UnknownEntityHeader } from "./UnknownEntityHeader";
import { resolveCoverImage } from "@/utils/resolveCoverImage";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { Icon } from "@/components/ui/Icon";

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
    if (!type) return null;
    return isMondoEntityType(type) ? (type as MondoEntityType) : null;
  }, [type]);

  const label = useMemo(() => buildHeaderLabel(entityType), [entityType]);

  const displayName = useMemo(() => {
    const cached = file as TCachedFile | undefined;
    return cached ? getEntityDisplayName(cached) : "Untitled";
  }, [file]);

  const cover = useMemo(() => {
    const cached = file as TCachedFile | undefined;
    if (!cached) return null;
    return resolveCoverImage(app, cached);
  }, [app, file]);

  const coverSrc = useMemo(() => {
    if (!cover) return null;
    return cover.kind === "vault" ? cover.resourcePath : cover.url;
  }, [cover]);

  const handleCoverClick = useCallback(() => {
    if (!cover) {
      return;
    }

    try {
      if (cover.kind === "vault") {
        const leaf = app.workspace.getLeaf(false) ?? app.workspace.getLeaf(true);
        void leaf?.openFile(cover.file);
      } else if (typeof window !== "undefined") {
        window.open(cover.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("EntityHeader: failed to open cover image", error);
    }
  }, [app, cover]);

  const placeholderIcon = useMemo(() => {
    if (!entityType) {
      return "file-text";
    }
    return MONDO_ENTITIES[entityType]?.icon ?? "file-text";
  }, [entityType]);

  const headerClasses = [
    "flex min-h-[5rem] items-center justify-between gap-3",
    "rounded-md border border-[var(--background-modifier-border)]",
    "bg-[var(--background-secondary)] px-3 py-2",
  ].join(" ");

  const fileRef = file as TCachedFile | undefined;

  return (
    <div className={headerClasses}>
      {/* Block 1: Cover */}
      {coverSrc ? (
        <button
          type="button"
          onClick={handleCoverClick}
          className="group h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-transparent focus:outline-none focus-visible:border-[var(--interactive-accent)]"
          aria-label="Open cover image"
        >
          <img
            src={coverSrc}
            alt="Cover thumbnail"
            className="h-full w-full transition-transform group-hover:scale-[1.02]"
            style={{ objectFit: "cover" }}
          />
        </button>
      ) : (
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-[var(--background-modifier-border)]">
          <Icon
            name={placeholderIcon}
            className="h-8 w-8 text-[var(--text-muted)]"
          />
        </div>
      )}

      {/* Block 2: Name (1st line) and Chip (2nd line) */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--text-normal)]">
          {displayName}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Mondo Note • {label}
        </div>
      </div>

      {/* Block 3: Actions (right) */}
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
