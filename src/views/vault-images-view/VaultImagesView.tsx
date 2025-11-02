import type { KeyboardEvent, MouseEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EventRef, TFile } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { ReadableDate } from "@/components/ui/ReadableDate";
import { Cover } from "@/components/ui/Cover";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import { isImageFile } from "@/utils/fileTypeFilters";
import { openEditImageModal } from "@/utils/EditImageModal";
import { formatBytes } from "@/utils/formatBytes";

type ImageEntry = {
  file: TFile;
  resourcePath: string;
};

type ImageDimensions = {
  width: number;
  height: number;
};

type ViewMode = "wall" | "grid";

const VIEW_MODE_SETTING_KEY = "vaultImages.viewMode";

export const VaultImagesView = () => {
  const app = useApp();
  const [files, setFiles] = useState<TFile[]>([]);
  const initialViewMode = useMemo<ViewMode>(() => {
    const pluginInstance = (app as any)?.plugins?.getPlugin?.("mondo") as
      | any
      | undefined;
    const stored = pluginInstance?.settings?.vaultImages?.viewMode;
    return stored === "grid" ? "grid" : "wall";
  }, [app]);
  const viewModeSetting = useSetting<ViewMode>(
    VIEW_MODE_SETTING_KEY,
    initialViewMode
  );
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [dimensions, setDimensions] = useState<Record<string, ImageDimensions | null>>({});
  const dimensionsRef = useRef(new Map<string, ImageDimensions | null>());
  const wallContainerRef = useRef<HTMLDivElement | null>(null);
  const [supportsHover, setSupportsHover] = useState(false);
  const [hoverCard, setHoverCard] = useState<
    | {
        entry: ImageEntry;
        position: { x: number; y: number };
      }
    | null
  >(null);

  useEffect(() => {
    setViewMode(viewModeSetting);
  }, [viewModeSetting]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSupportsHover(event.matches);
    };

    setSupportsHover(query.matches);

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleChange);
      return () => {
        query.removeEventListener("change", handleChange);
      };
    }

    query.addListener(handleChange);
    return () => {
      query.removeListener(handleChange);
    };
  }, []);

  const collect = useCallback(() => {
    const images = app.vault
      .getFiles()
      .filter((file) => isImageFile(file))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    setFiles(images);
  }, [app]);

  useEffect(() => {
    collect();

    const refs: EventRef[] = [];
    const handleChange = () => {
      collect();
    };

    refs.push(app.vault.on("create", handleChange));
    refs.push(app.vault.on("delete", handleChange));
    refs.push(app.vault.on("modify", handleChange));
    refs.push(app.vault.on("rename", handleChange));

    return () => {
      for (const ref of refs) {
        try {
          app.vault.offref(ref);
        } catch (error) {
          console.debug("VaultImagesView: failed to remove vault listener", error);
        }
      }
    };
  }, [app, collect]);

  const entries = useMemo((): ImageEntry[] => {
    const resourceMap = new Map<string, string>();

    return files.map((file) => {
      let resource = resourceMap.get(file.path);
      if (!resource) {
        resource = app.vault.getResourcePath(file);
        resourceMap.set(file.path, resource);
      }

      return {
        file,
        resourcePath: resource,
      };
    });
  }, [app, files]);

  useEffect(() => {
    let disposed = false;

    entries.forEach((entry) => {
      if (dimensionsRef.current.has(entry.file.path)) {
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (disposed) {
          return;
        }

        const value: ImageDimensions = {
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
        dimensionsRef.current.set(entry.file.path, value);
        setDimensions((previous) => ({
          ...previous,
          [entry.file.path]: value,
        }));
      };
      image.onerror = () => {
        if (disposed) {
          return;
        }

        dimensionsRef.current.set(entry.file.path, null);
        setDimensions((previous) => ({
          ...previous,
          [entry.file.path]: null,
        }));
      };
      image.src = entry.resourcePath;
    });

    return () => {
      disposed = true;
    };
  }, [entries]);

  const plugin = useMemo(
    () => (app as any)?.plugins?.getPlugin?.("mondo") as any | undefined,
    [app]
  );

  const persistViewMode = useCallback(
    async (mode: ViewMode) => {
      if (!plugin) {
        return;
      }

      const settings = plugin.settings ?? {};
      const vaultImagesSettings = settings.vaultImages ?? {};
      if (vaultImagesSettings.viewMode === mode) {
        return;
      }

      plugin.settings = {
        ...settings,
        vaultImages: {
          ...vaultImagesSettings,
          viewMode: mode,
        },
      };

      try {
        await plugin.saveSettings?.();
      } catch (error) {
        console.debug("VaultImagesView: failed to persist view mode", error);
      }

      try {
        window.dispatchEvent(new CustomEvent("mondo:settings-updated"));
      } catch (error) {
        console.debug(
          "VaultImagesView: failed to dispatch settings update event",
          error
        );
      }
    },
    [plugin]
  );

  const handleToggleViewMode = useCallback(
    (checked: boolean) => {
      const mode: ViewMode = checked ? "grid" : "wall";
      setViewMode(mode);
      void persistViewMode(mode);
    },
    [persistViewMode]
  );

  const handleEditImage = useCallback(
    (file: TFile) => {
      openEditImageModal(app, file);
    },
    [app]
  );

  const handleDeleteImage = useCallback(
    async (file: TFile) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${file.basename}"?`
      );
      if (!confirmed) {
        return;
      }

      try {
        await app.vault.delete(file);
        setFiles((previous) =>
          previous.filter((entry) => entry.path !== file.path)
        );
        setDimensions((previous) => {
          if (!(file.path in previous)) {
            return previous;
          }

          const next = { ...previous };
          delete next[file.path];
          dimensionsRef.current.delete(file.path);
          return next;
        });
      } catch (error) {
        console.debug("VaultImagesView: failed to delete image", file.path, error);
      }
    },
    [app]
  );

  const rows = useMemo(
    () =>
      entries.map((entry) => {
        const dimensionValue = dimensions[entry.file.path] ?? null;
        const dimensionLabel = dimensionValue
          ? `${dimensionValue.width} × ${dimensionValue.height}`
          : "—";

        return {
          entry,
          dimensionLabel,
          sizeLabel: formatBytes(entry.file.stat.size ?? 0),
          typeLabel: entry.file.extension.toUpperCase(),
        };
      }),
    [dimensions, entries]
  );

  const isGridView = viewMode === "grid";

  useEffect(() => {
    setHoverCard(null);
  }, [isGridView]);

  useEffect(() => {
    if (!supportsHover) {
      setHoverCard(null);
    }
  }, [supportsHover]);

  const updateHoverCardPosition = useCallback((target: HTMLElement) => {
    const container = wallContainerRef.current;
    if (!container) {
      return null;
    }

    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const midpoint =
      targetRect.left - containerRect.left + targetRect.width / 2;
    const clampedX = Math.min(
      Math.max(midpoint, 16),
      containerRect.width - 16
    );

    const offsetTop = targetRect.top - containerRect.top;

    return {
      x: clampedX,
      y: offsetTop,
    };
  }, []);

  const handleWallItemEnter = useCallback(
    (entry: ImageEntry, event: MouseEvent<HTMLDivElement>) => {
      if (!supportsHover) {
        return;
      }

      const position = updateHoverCardPosition(event.currentTarget);
      if (!position) {
        return;
      }

      setHoverCard({
        entry,
        position,
      });
    },
    [supportsHover, updateHoverCardPosition]
  );

  const handleWallItemMove = useCallback(
    (entry: ImageEntry, event: MouseEvent<HTMLDivElement>) => {
      if (!supportsHover) {
        return;
      }

      const position = updateHoverCardPosition(event.currentTarget);
      if (!position) {
        return;
      }

      setHoverCard({
        entry,
        position,
      });
    },
    [supportsHover, updateHoverCardPosition]
  );

  const handleWallItemLeave = useCallback(() => {
    setHoverCard(null);
  }, []);

  const handleWallItemKeyDown = useCallback(
    (entry: ImageEntry, event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleEditImage(entry.file);
      }
    },
    [handleEditImage]
  );

  const hoverCardDetails = useMemo(() => {
    if (!hoverCard) {
      return null;
    }

    const { entry } = hoverCard;
    const dimensionValue = dimensions[entry.file.path] ?? null;
    const dimensionLabel = dimensionValue
      ? `${dimensionValue.width} × ${dimensionValue.height}`
      : "—";

    return {
      entry,
      dimensionLabel,
      sizeLabel: formatBytes(entry.file.stat.size ?? 0),
      createdAt: entry.file.stat.ctime,
      updatedAt: entry.file.stat.mtime,
    };
  }, [dimensions, hoverCard]);

  const totals = useMemo(() => {
    const totalSize = files.reduce((acc, file) => acc + (file.stat.size ?? 0), 0);
    return {
      totalImages: files.length,
      totalSizeLabel: formatBytes(totalSize),
    };
  }, [files]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--background-modifier-border)] pb-3">
        <Typography variant="h1" className="flex-1">
          Images
        </Typography>
        <div className="flex items-center">
          <Switch
            checked={isGridView}
            onCheckedChange={handleToggleViewMode}
            uncheckedLabel="Wall"
            checkedLabel="Grid"
            aria-label="Toggle between wall and grid layouts"
            className="shrink-0"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total Images
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totals.totalImages.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total File Size
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totals.totalSizeLabel}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--background-modifier-border)] p-6 text-center text-[var(--text-muted)]">
          No images found in your vault.
        </div>
      ) : isGridView ? (
        <div className="space-y-3">
          <div className="hidden overflow-hidden rounded-lg border border-[var(--background-modifier-border)] sm:block">
            <Table>
            <thead className="bg-[var(--background-secondary-alt, var(--background-secondary))]">
              <tr>
                <Table.HeadCell className="w-24 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Cover
                </Table.HeadCell>
                <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Image
                </Table.HeadCell>
                <Table.HeadCell className="w-32 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Type
                </Table.HeadCell>
                <Table.HeadCell className="w-48 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Size
                </Table.HeadCell>
                <Table.HeadCell className="w-20 p-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <span className="sr-only">Actions</span>
                </Table.HeadCell>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, dimensionLabel, sizeLabel, typeLabel }) => (
                <Table.Row
                  key={entry.file.path}
                  className="border-t border-[var(--background-modifier-border)]"
                >
                  <Table.Cell className="p-3 align-middle">
                    <Cover
                      src={entry.resourcePath}
                      alt={entry.file.basename}
                      size={64}
                      editLabel={`Edit cover for ${entry.file.basename}`}
                      onEditCover={() => {
                        handleEditImage(entry.file);
                      }}
                    />
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <Button
                        variant="link"
                        tone="info"
                        className="group relative max-w-xl font-medium"
                        onClick={() => {
                          handleEditImage(entry.file);
                        }}
                        aria-label={`Edit ${entry.file.basename}`}
                      >
                        <span className="block max-w-full truncate">
                          {entry.file.basename}
                        </span>
                        <span
                          className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-xl rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block"
                          role="presentation"
                        >
                          {entry.file.basename}
                        </span>
                      </Button>
                      <div
                        className="group relative max-w-xl text-xs text-[var(--text-muted)]"
                        aria-label={entry.file.path}
                        tabIndex={0}
                      >
                        <span className="block truncate">{entry.file.path}</span>
                        <span
                          className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-xl rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block"
                          role="presentation"
                        >
                          {entry.file.path}
                        </span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-sm text-[var(--text-normal)]">
                    {typeLabel}
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-sm text-[var(--text-normal)]">
                    <div className="flex flex-col gap-1">
                      <span>{sizeLabel}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {dimensionLabel}
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="flex items-center justify-end gap-1 p-3 align-middle">
                    <Button
                      icon="external-link"
                      variant="link"
                      tone="info"
                      aria-label={`Open ${entry.file.basename} in a new tab`}
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.open(
                            entry.resourcePath,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }
                      }}
                    />
                    <Button
                      icon="trash"
                      variant="link"
                      tone="danger"
                      aria-label={`Delete ${entry.file.basename}`}
                      onClick={() => {
                        void handleDeleteImage(entry.file);
                      }}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </tbody>
            </Table>
          </div>
          <div className="space-y-3 sm:hidden">
            {rows.map(({ entry, dimensionLabel, sizeLabel, typeLabel }) => (
              <div
                key={entry.file.path}
                className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4"
              >
                <div className="flex items-start gap-3">
                  <Cover
                    src={entry.resourcePath}
                    alt={entry.file.basename}
                    size={80}
                    editLabel={`Edit ${entry.file.basename}`}
                    onEditCover={() => {
                      handleEditImage(entry.file);
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Button
                      variant="link"
                      tone="info"
                      className="block w-full truncate text-left font-medium"
                      onClick={() => {
                        handleEditImage(entry.file);
                      }}
                      aria-label={`Edit ${entry.file.basename}`}
                    >
                      {entry.file.basename}
                    </Button>
                    <div
                      className="text-xs text-[var(--text-muted)]"
                      aria-label={entry.file.path}
                      title={entry.file.path}
                    >
                      <span className="block truncate">{entry.file.path}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-normal)]">
                      <span>Type: {typeLabel}</span>
                      <span>Size: {sizeLabel}</span>
                      <span className="text-[var(--text-muted)]">Dimensions: {dimensionLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    icon="external-link"
                    variant="link"
                    tone="info"
                    aria-label={`Open ${entry.file.basename} in a new tab`}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.open(entry.resourcePath, "_blank", "noopener,noreferrer");
                      }
                    }}
                  />
                  <Button
                    icon="trash"
                    variant="link"
                    tone="danger"
                    aria-label={`Delete ${entry.file.basename}`}
                    onClick={() => {
                      void handleDeleteImage(entry.file);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={wallContainerRef}
          className="relative overflow-visible rounded-lg border border-[var(--background-modifier-border)] p-2"
          onMouseLeave={handleWallItemLeave}
        >
          <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {entries.map((entry) => (
              <div key={entry.file.path} className="group relative aspect-square">
                <div
                  role="button"
                  tabIndex={0}
                  className="relative h-full w-full cursor-pointer overflow-hidden outline-none transition-transform duration-200 ease-out hover:z-20 hover:scale-[1.06] hover:rounded-lg hover:shadow-[0_14px_45px_rgba(0,0,0,0.55)] focus-visible:z-20 focus-visible:scale-[1.04] focus-visible:rounded-lg focus-visible:shadow-[0_12px_36px_rgba(0,0,0,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0"
                  onMouseEnter={(event) => {
                    handleWallItemEnter(entry, event);
                  }}
                  onMouseMove={(event) => {
                    handleWallItemMove(entry, event);
                  }}
                  onMouseLeave={handleWallItemLeave}
                  aria-label={`Edit ${entry.file.basename}`}
                >
                  <Cover
                    src={entry.resourcePath}
                    alt={entry.file.basename}
                    size="100%"
                    coverClassName="rounded-none border-none"
                    editLabel={`Edit ${entry.file.basename}`}
                    onEditCover={() => {
                      handleEditImage(entry.file);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {supportsHover && hoverCard && hoverCardDetails ? (
            <div
              className="pointer-events-none absolute z-30 w-64 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-4 text-[var(--text-normal)] shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-opacity duration-150"
              style={{
                left: hoverCard.position.x,
                top: hoverCard.position.y,
                transform: "translate(-50%, calc(-100% - 12px))",
                backgroundColor: "var(--background-secondary, var(--background-primary))",
              }}
            >
              <div className="text-sm font-semibold">
                {hoverCardDetails.entry.file.basename}
              </div>
              <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {hoverCardDetails.entry.file.path}
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)]">File size</span>
                  <span>{hoverCardDetails.sizeLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)]">Dimensions</span>
                  <span>{hoverCardDetails.dimensionLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)]">Created</span>
                  <ReadableDate
                    value={hoverCardDetails.createdAt}
                    className="text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)]">Last update</span>
                  <ReadableDate
                    value={hoverCardDetails.updatedAt}
                    className="text-right"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default VaultImagesView;
