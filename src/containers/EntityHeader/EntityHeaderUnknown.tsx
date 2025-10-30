import { useCallback, useMemo } from "react";
import { Notice } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import { Icon } from "@/components/ui/Icon";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import {
  MONDO_ENTITIES,
  MONDO_ENTITY_TYPES,
  type MondoEntityType,
} from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import { resolveCoverImage } from "@/utils/resolveCoverImage";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";

const buildEntityOptions = () =>
  MONDO_ENTITY_TYPES.map((type) => ({
    type,
    label: MONDO_ENTITIES[type]?.name ?? type,
    icon: MONDO_ENTITIES[type]?.icon,
  })).sort((a, b) => a.label.localeCompare(b.label));

const headerClasses = [
  "flex min-h-[5rem] items-center justify-between gap-3",
  "rounded-md border border-[var(--background-modifier-border)]",
  "bg-[var(--background-secondary)] px-3 py-2",
].join(" ");

export const EntityHeaderUnknown = () => {
  const app = useApp();
  const { file } = useEntityFile();
  const cachedFile = file as TCachedFile | undefined;

  const options = useMemo(buildEntityOptions, []);

  const displayName = useMemo(
    () => (cachedFile ? getEntityDisplayName(cachedFile) : "Untitled"),
    [cachedFile]
  );

  const cover = useMemo(() => {
    if (!cachedFile) return null;
    return resolveCoverImage(app, cachedFile);
  }, [app, cachedFile]);

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
      console.error("EntityHeaderUnknown: failed to open cover image", error);
    }
  }, [app, cover]);

  const handleSelect = useCallback(
    async (nextType: MondoEntityType) => {
      if (!cachedFile?.file) {
        new Notice("Unable to update note type. Please save the note and try again.");
        return;
      }

      try {
        await app.fileManager.processFrontMatter(cachedFile.file, (frontmatter) => {
          frontmatter.type = nextType;
        });
      } catch (error) {
        console.error("EntityHeaderUnknown: failed to assign Mondo type", error);
        new Notice("Failed to update the note type.");
      }
    },
    [app, cachedFile?.file]
  );

  const secondaryActions = useMemo(
    () =>
      options.map((option) => ({
        label: option.label,
        icon: option.icon,
        onSelect: () => {
          void handleSelect(option.type);
        },
      })),
    [handleSelect, options]
  );

  return (
    <div className={headerClasses}>
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
            name="file-text"
            className="h-8 w-8 text-[var(--text-muted)]"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--text-normal)]">
          {displayName}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Assign a Mondo type to unlock entity tools
        </div>
      </div>

      <SplitButton
        type="button"
        icon="plus"
        menuAriaLabel="Select Mondo note type"
        secondaryActions={secondaryActions}
        primaryOpensMenu
        disabled={secondaryActions.length === 0}
      >
        Create as Mondo Note
      </SplitButton>
    </div>
  );
};

export default EntityHeaderUnknown;
