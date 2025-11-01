import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Menu, Notice, Platform, TFile } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import type {
  MondoEntityCreateAttributes,
  MondoEntityLinkConfig,
} from "@/types/MondoEntityConfig";
import { isMondoEntityType } from "@/types/MondoFileType";
import createEntityForEntity from "@/utils/createEntityForEntity";
import { resolveCoverImage } from "@/utils/resolveCoverImage";
import { openEditImageModal } from "@/utils/EditImageModal";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import {
  useEntityLinksLayout,
  type CollapsedPanelSummary,
} from "@/context/EntityLinksLayoutContext";

type EntityHeaderMondoProps = {
  entityType: MondoEntityType;
};

type RelatedAction = {
  key: string;
  label: string;
  icon?: string;
  targetType: string;
  titleTemplate?: string;
  attributes?: MondoEntityCreateAttributes;
  linkProperties?: string | string[];
  openAfterCreate: boolean;
};

const buildHeaderLabel = (entityType: MondoEntityType) => {
  const config = MONDO_ENTITIES[entityType];
  return config?.name ?? entityType;
};

const headerClasses = [
  "flex min-h-[5rem] items-start gap-3",
  "rounded-md border border-[var(--background-modifier-border)]",
  "bg-[var(--background-secondary)] px-3 py-2",
].join(" ");

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const toAttributes = (
  value: unknown
): MondoEntityCreateAttributes | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as MondoEntityCreateAttributes;
};

const extractTargetTypeFromAttributes = (
  attrs: MondoEntityCreateAttributes | undefined
): string | undefined => {
  if (!attrs) {
    return undefined;
  }
  const raw = attrs.type;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed || /^\{.+\}$/.test(trimmed)) {
    return undefined;
  }
  return trimmed.toLowerCase();
};

const normalizeLinkProperties = (
  value: string | string[] | undefined
): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  const list = Array.isArray(value) ? value : [value];
  const normalized = list
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalized));
};

const ACCEPTED_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "avif",
  "heic",
  "heif",
]);

const getFileExtension = (file: File): string => {
  const nameMatch = /\.([^.]+)$/.exec(file.name);
  if (nameMatch) {
    return nameMatch[1].toLowerCase();
  }

  const mime = file.type;
  if (typeof mime === "string" && mime.startsWith("image/")) {
    const [, ext] = mime.split("/");
    if (ext) {
      return ext.toLowerCase();
    }
  }

  return "png";
};

const isAcceptedImageFile = (file: File): boolean => {
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }

  const extension = getFileExtension(file);
  return ACCEPTED_IMAGE_EXTENSIONS.has(extension);
};

const ensureAttachmentFilename = (file: File): string => {
  const extension = getFileExtension(file);
  const trimmed = file.name.trim();

  if (trimmed.length === 0) {
    return `cover.${extension}`;
  }

  if (trimmed.toLowerCase().endsWith(`.${extension}`)) {
    return trimmed;
  }

  if (trimmed.includes(".")) {
    return trimmed;
  }

  return `${trimmed}.${extension}`;
};

const CollapsedPanelButton = ({ panel }: { panel: CollapsedPanelSummary }) => {
  return (
    <button
      type="button"
      onClick={panel.onExpand}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-1 text-xs font-medium text-[var(--text-normal)] transition-colors hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0"
      aria-label={`Expand ${panel.label} panel`}
      title={panel.label}
      data-entity-panel={panel.panelType}
    >
      {panel.icon ? (
        <Icon
          name={panel.icon}
          className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-normal)]"
        />
      ) : null}
      <span className="min-w-0 truncate text-[var(--text-normal)]">
        {panel.label}
      </span>
      {panel.badgeLabel ? (
        <Badge className="flex-shrink-0">{panel.badgeLabel}</Badge>
      ) : null}
    </button>
  );
};

export const EntityHeaderMondo = ({ entityType }: EntityHeaderMondoProps) => {
  const { file } = useEntityFile();
  const app = useApp();

  const cachedFile = file as TCachedFile | undefined;
  const coverLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const coverCameraInputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const previousCoverRef = useRef<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const displayName = useMemo(
    () => (cachedFile ? getEntityDisplayName(cachedFile) : "Untitled"),
    [cachedFile]
  );

  const label = useMemo(() => buildHeaderLabel(entityType), [entityType]);

  const cover = useMemo(() => {
    if (!cachedFile) return null;
    return resolveCoverImage(app, cachedFile);
  }, [app, cachedFile]);

  const coverSrc = useMemo(() => {
    if (!cover) return null;
    return cover.kind === "vault" ? cover.resourcePath : cover.url;
  }, [cover]);

  useEffect(() => {
    const header = headerRef.current;
    const currentCover = coverSrc ?? null;

    if (header && currentCover && previousCoverRef.current !== currentCover) {
      header.focus({ preventScroll: true });
    }

    previousCoverRef.current = currentCover;
  }, [coverSrc]);

  const handleCoverClick = useCallback(() => {
    if (!cover) {
      return;
    }

    try {
      if (cover.kind === "vault") {
        openEditImageModal(app, cover.file);
      } else if (typeof window !== "undefined") {
        window.open(cover.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("EntityHeaderMondo: failed to open cover image", error);
    }
  }, [app, cover]);

  const placeholderIcon = useMemo(() => {
    const config = MONDO_ENTITIES[entityType];
    return config?.icon ?? "file-text";
  }, [entityType]);

  const entityConfig = MONDO_ENTITIES[entityType];

  const panelMap = useMemo(() => {
    const map = new Map<string, MondoEntityLinkConfig>();
    const links = (entityConfig?.links ?? []) as MondoEntityLinkConfig[];
    links.forEach((link) => {
      const key = toOptionalString((link as any)?.key);
      if (key) {
        map.set(key, link);
      }
    });
    return map;
  }, [entityConfig?.links]);

  const actions = useMemo(() => {
    const specs = entityConfig?.createRelated ?? [];
    if (specs.length === 0) {
      return [] as RelatedAction[];
    }

    return specs
      .map((spec) => {
        const panelKey =
          toOptionalString((spec as any).referenceLink) ??
          toOptionalString(spec.panelKey) ??
          toOptionalString(spec.key);
        const panel = panelKey ? panelMap.get(panelKey) : undefined;
        const panelAny = panel as any;
        const panelConfig = toRecord(panelAny?.config);

        const specCreate = spec.create ?? {};
        const panelCreate = toRecord(panelConfig?.createEntity);
        const specAttributes = toAttributes(specCreate.attributes);
        const panelAttributes = toAttributes(panelCreate?.attributes);

        const targetTypeRaw =
          extractTargetTypeFromAttributes(specAttributes) ??
          extractTargetTypeFromAttributes(panelAttributes) ??
          toOptionalString(spec.targetType) ??
          toOptionalString(panelConfig?.targetType ?? panelAny?.targetType);

        if (!targetTypeRaw) {
          return null;
        }

        const targetType = targetTypeRaw.toLowerCase();
        if (!isMondoEntityType(targetType)) {
          return null;
        }
        const key = toOptionalString(spec.key) ?? panelKey ?? targetType;
        const targetEntity = MONDO_ENTITIES[targetType as MondoEntityType];

        const panelTitle = toOptionalString(panelConfig?.title);
        const label =
          toOptionalString(spec.label) ??
          panelTitle ??
          targetEntity?.name ??
          targetType;

        const icon =
          toOptionalString(spec.icon) ??
          toOptionalString(panelConfig?.icon) ??
          targetEntity?.icon;

        const rawTitle =
          toOptionalString(specCreate.title) ??
          toOptionalString(panelCreate?.title);
        const fallbackTitle = targetEntity?.name ?? label;
        const titleTemplate = rawTitle
          ? rawTitle
          : fallbackTitle
          ? `Untitled ${fallbackTitle}`
          : undefined;

        const attributes = specAttributes ?? panelAttributes;

        const linkProperties = (specCreate.linkProperties ??
          panelCreate?.linkProperties ??
          panelConfig?.properties ??
          panelConfig?.prop) as string | string[] | undefined;

        const openAfterCreate =
          typeof specCreate.openAfterCreate === "boolean"
            ? specCreate.openAfterCreate
            : typeof panelCreate?.openAfterCreate === "boolean"
            ? (panelCreate.openAfterCreate as boolean)
            : true;

        return {
          key,
          label,
          icon,
          targetType,
          titleTemplate,
          attributes,
          linkProperties,
          openAfterCreate,
        } as RelatedAction;
      })
      .filter((action): action is RelatedAction => action !== null);
  }, [entityConfig?.createRelated, panelMap, entityType]);

  const { collapsedPanels } = useEntityLinksLayout();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const isPending = pendingAction !== null;
  const isBusy = isPending || isUploadingCover;

  const handleCreateAction = useCallback(
    async (action: RelatedAction) => {
      if (!cachedFile) {
        new Notice("Unable to determine the current entity.");
        return;
      }

      setPendingAction(action.key);
      const failureLabel = (action.label || action.targetType).toLowerCase();
      try {
        const result = await createEntityForEntity({
          app,
          targetType: action.targetType,
          hostEntity: cachedFile,
          titleTemplate: action.titleTemplate,
          attributeTemplates: action.attributes,
          linkProperties: normalizeLinkProperties(action.linkProperties),
          openAfterCreate: action.openAfterCreate,
        });

        if (!result) {
          new Notice(`Failed to create ${failureLabel} note.`);
        }
      } catch (error) {
        console.error(
          "EntityHeaderMondo: failed to create related entity",
          error
        );
        new Notice(`Failed to create ${failureLabel} note.`);
      } finally {
        setPendingAction(null);
      }
    },
    [app, cachedFile]
  );

  const primary = actions[0];
  const hasCollapsedPanels = collapsedPanels.length > 0;

  const secondary = useMemo(
    () =>
      actions.map((action) => ({
        label: action.label,
        icon: action.icon,
        disabled: isBusy,
        onSelect: () => {
          if (isBusy) {
            return;
          }
          void handleCreateAction(action);
        },
      })),
    [actions, handleCreateAction, isBusy]
  );

  const handlePrimaryClick = useCallback(() => {
    if (!primary || isBusy) {
      return;
    }
    void handleCreateAction(primary);
  }, [handleCreateAction, isBusy, primary]);

  const handleCoverPlaceholderClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (isUploadingCover) {
        return;
      }

      if (Platform.isMobileApp) {
        event.preventDefault();

        const menu = new Menu();

        menu.addItem((item) => {
          item.setTitle("Take Photo");
          item.onClick(() => {
            if (coverCameraInputRef.current) {
              coverCameraInputRef.current.click();
            } else {
              coverLibraryInputRef.current?.click();
            }
          });
        });

        menu.addItem((item) => {
          item.setTitle("Choose from Library");
          item.onClick(() => {
            coverLibraryInputRef.current?.click();
          });
        });

        menu.showAtMouseEvent(event.nativeEvent);
        return;
      }

      coverLibraryInputRef.current?.click();
    },
    [isUploadingCover]
  );

  const handleCoverFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const selectedFile = input.files?.[0];
      input.value = "";

      if (!selectedFile) {
        return;
      }

      if (!isAcceptedImageFile(selectedFile)) {
        new Notice("Please select an image file.");
        return;
      }

      if (!cachedFile) {
        new Notice("Unable to determine the current entity.");
        return;
      }

      setIsUploadingCover(true);

      try {
        const filename = ensureAttachmentFilename(selectedFile);
        const targetPath =
          await app.fileManager.getAvailablePathForAttachment(
            filename,
            cachedFile.file.path
          );
        const arrayBuffer = await selectedFile.arrayBuffer();
        const created = await app.vault.createBinary(targetPath, arrayBuffer);

        let targetFile: TFile | null = null;
        if (created instanceof TFile) {
          targetFile = created;
        } else {
          const abstract = app.vault.getAbstractFileByPath(targetPath);
          if (abstract instanceof TFile) {
            targetFile = abstract;
          }
        }

        if (!targetFile) {
          throw new Error("Failed to create image attachment");
        }

        const linktext = app.metadataCache.fileToLinktext(
          targetFile,
          cachedFile.file.path,
          false
        );

        await app.fileManager.processFrontMatter(
          cachedFile.file,
          (frontmatter) => {
            frontmatter.cover = `[[${linktext}]]`;
          }
        );
      } catch (error) {
        console.error("EntityHeaderMondo: failed to attach cover image", error);
        new Notice("Failed to set cover image.");
      } finally {
        setIsUploadingCover(false);
      }
    },
    [app, cachedFile]
  );

  return (
    <div
      ref={headerRef}
      className={headerClasses}
      tabIndex={-1}
      data-entity-header
    >
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
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
          <input
            ref={coverLibraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          <input
            ref={coverCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          <button
            type="button"
            onClick={handleCoverPlaceholderClick}
            className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[var(--text-muted)] transition hover:border-[var(--background-modifier-border-hover)] hover:text-[var(--text-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Add cover image"
            disabled={isUploadingCover}
          >
            <Icon
              name={isUploadingCover ? "loader-2" : placeholderIcon}
              className={`h-8 w-8 text-[var(--text-muted)] ${
                isUploadingCover ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--text-normal)]">
              {displayName}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Mondo Note • {label}
            </div>
          </div>
          {primary ? (
            <div className="flex-shrink-0">
              <SplitButton
                onClick={handlePrimaryClick}
                secondaryActions={secondary}
                menuAriaLabel="Select related entity to create"
                disabled={isBusy}
              >
                {`+ ${primary.label}`}
              </SplitButton>
            </div>
          ) : null}
        </div>

        {hasCollapsedPanels ? (
          <div
            className="flex flex-wrap gap-2"
            aria-label="Collapsed entity link panels"
          >
            {collapsedPanels.map((panel) => (
              <CollapsedPanelButton key={panel.id} panel={panel} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EntityHeaderMondo;
