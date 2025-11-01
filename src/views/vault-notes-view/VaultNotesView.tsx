import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { Menu, Notice, Platform, TFile, type EventRef } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { useApp } from "@/hooks/use-app";
import { isMarkdownFile } from "@/utils/fileTypeFilters";
import { resolveCoverImage, type ResolvedCoverImage } from "@/utils/resolveCoverImage";
import { formatBytes } from "@/utils/formatBytes";
import { getMondoEntityConfig, isMondoEntityType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { openEditImageModal } from "@/utils/EditImageModal";

type NoteRow = {
  file: TFile;
  displayName: string;
  pathLabel: string;
  cover: ResolvedCoverImage | null;
  size: number;
  sizeLabel: string;
  typeLabel: string;
  typeIcon: string;
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

export const VaultNotesView = () => {
  const app = useApp();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadingCoverPath, setUploadingCoverPath] = useState<string | null>(
    null
  );
  const coverLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const coverCameraInputRef = useRef<HTMLInputElement | null>(null);
  const coverTargetRef = useRef<TFile | null>(null);

  const collect = useCallback(async (): Promise<NoteRow[]> => {
    const markdownFiles = app.vault
      .getFiles()
      .filter((file) => isMarkdownFile(file))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    const results: NoteRow[] = [];

    for (const file of markdownFiles) {
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};
      const showRaw = typeof frontmatter.show === "string" ? frontmatter.show : "";
      const displayName = showRaw.trim() || file.basename;
      const cachedFile: TCachedFile = { file, cache: cache ?? undefined };
      const cover = resolveCoverImage(app, cachedFile);
      const parentPath = file.parent?.path ?? "";
      const hasShowField = Boolean(showRaw.trim());
      const pathLabel = hasShowField
        ? file.path
        : parentPath.length > 0
        ? parentPath
        : "/";
      const rawType =
        typeof frontmatter.type === "string" ? frontmatter.type.trim() : "";
      const normalizedType = rawType.toLowerCase();
      let typeLabel = rawType || "Markdown";
      let typeIcon = "file-text";

      if (normalizedType && isMondoEntityType(normalizedType)) {
        const config = getMondoEntityConfig(normalizedType);
        typeLabel = config?.name ?? (rawType || "Markdown");
        typeIcon = config?.icon ?? "tag";
      } else if (normalizedType) {
        typeLabel = rawType;
        typeIcon = "tag";
      }

      const size = file.stat.size ?? 0;

      results.push({
        file,
        displayName,
        pathLabel,
        cover,
        size,
        sizeLabel: formatBytes(size),
        typeLabel,
        typeIcon,
      });
    }

    return results;
  }, [app]);

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      setIsLoading(true);
      const items = await collect();
      if (!disposed) {
        setRows(items);
        setIsLoading(false);
      }
    };

    void refresh();

    const refs: EventRef[] = [];
    const handleChange = () => {
      void refresh();
    };

    refs.push(app.vault.on("create", handleChange));
    refs.push(app.vault.on("delete", handleChange));
    refs.push(app.vault.on("modify", handleChange));
    refs.push(app.vault.on("rename", handleChange));

    return () => {
      disposed = true;
      for (const ref of refs) {
        try {
          app.vault.offref(ref);
        } catch (error) {
          console.debug("VaultNotesView: failed to remove vault listener", error);
        }
      }
    };
  }, [app, collect]);

  const handleOpenFile = useCallback(
    async (file: TFile) => {
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(file);
    },
    [app]
  );

  const handleDeleteFile = useCallback(
    async (file: TFile) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${file.basename}"?`
      );
      if (!confirmed) {
        return;
      }

      try {
        await app.vault.delete(file);
        setRows((previous) =>
          previous.filter((entry) => entry.file.path !== file.path)
        );
      } catch (error) {
        console.debug("VaultNotesView: failed to delete note", file.path, error);
      }
    },
    [app]
  );

  const handleCoverPlaceholderClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, file: TFile) => {
      if (uploadingCoverPath && uploadingCoverPath !== file.path) {
        return;
      }

      coverTargetRef.current = file;

      if (Platform.isMobileApp) {
        event.preventDefault();

        const menu = new Menu();

        menu.addItem((item) => {
          item.setTitle("Select image or take a photo");
          item.onClick(() => {
            if (coverCameraInputRef.current) {
              coverCameraInputRef.current.click();
            } else {
              coverLibraryInputRef.current?.click();
            }
          });
        });

        menu.addItem((item) => {
          item.setTitle("Select image");
          item.onClick(() => {
            coverLibraryInputRef.current?.click();
          });
        });

        menu.showAtMouseEvent(event.nativeEvent);
        return;
      }

      coverLibraryInputRef.current?.click();
    },
    [uploadingCoverPath]
  );

  const handleCoverFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const selectedFile = input.files?.[0] ?? null;
      input.value = "";

      const targetFile = coverTargetRef.current;
      coverTargetRef.current = null;

      if (!selectedFile) {
        return;
      }

      if (!targetFile) {
        new Notice("Unable to determine the selected note.");
        return;
      }

      if (!isAcceptedImageFile(selectedFile)) {
        new Notice("Please select an image file.");
        return;
      }

      setUploadingCoverPath(targetFile.path);

      try {
        const filename = ensureAttachmentFilename(selectedFile);
        const targetPath = await app.fileManager.getAvailablePathForAttachment(
          filename,
          targetFile.path
        );
        const arrayBuffer = await selectedFile.arrayBuffer();
        const created = await app.vault.createBinary(targetPath, arrayBuffer);

        let attachment: TFile | null = null;
        if (created instanceof TFile) {
          attachment = created;
        } else {
          const abstract = app.vault.getAbstractFileByPath(targetPath);
          if (abstract instanceof TFile) {
            attachment = abstract;
          }
        }

        if (!attachment) {
          throw new Error("Failed to create image attachment");
        }

        const linktext = app.metadataCache.fileToLinktext(
          attachment,
          targetFile.path,
          false
        );

        await app.fileManager.processFrontMatter(targetFile, (frontmatter) => {
          frontmatter.cover = `[[${linktext}]]`;
        });
      } catch (error) {
        console.error("VaultNotesView: failed to set cover image", error);
        new Notice("Failed to set cover image.");
      } finally {
        setUploadingCoverPath(null);
      }
    },
    [app]
  );

  const handleCoverClick = useCallback(
    (cover: ResolvedCoverImage) => {
      try {
        if (cover.kind === "vault") {
          openEditImageModal(app, cover.file);
        } else if (typeof window !== "undefined") {
          window.open(cover.url, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        console.debug("VaultNotesView: failed to open cover image", error);
      }
    },
    [app]
  );

  const totals = useMemo(() => {
    const totalSize = rows.reduce((acc, row) => acc + row.size, 0);
    return {
      totalCount: rows.length,
      totalSize,
      totalSizeLabel: formatBytes(totalSize),
    };
  }, [rows]);

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-[var(--background-modifier-border)] pb-3">
        <Typography variant="h1">Markdown Notes</Typography>
      </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total Notes
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totals.totalCount.toLocaleString()}
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
      <div className="overflow-hidden rounded-lg border border-[var(--background-modifier-border)]">
        <Table>
          <thead className="bg-[var(--background-secondary-alt, var(--background-secondary))]">
            <tr>
              <Table.HeadCell className="w-20 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Cover
              </Table.HeadCell>
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Note
              </Table.HeadCell>
              <Table.HeadCell className="w-36 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Type
              </Table.HeadCell>
              <Table.HeadCell className="w-32 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Size
              </Table.HeadCell>
              <Table.HeadCell className="w-16 p-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <span className="sr-only">Actions</span>
              </Table.HeadCell>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <Table.Cell
                  colSpan={5}
                  className="p-6 text-center text-[var(--text-muted)]"
                >
                  Loading notes…
                </Table.Cell>
              </tr>
            ) : null}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <Table.Cell
                  colSpan={5}
                  className="p-6 text-center text-[var(--text-muted)]"
                >
                  No notes found.
                </Table.Cell>
              </tr>
            ) : null}
            {rows.map((row) => {
              const isUploadingCover = uploadingCoverPath === row.file.path;

              return (
                <Table.Row
                  key={row.file.path}
                  className="border-t border-[var(--background-modifier-border)]"
                >
                  <Table.Cell className="p-3 align-middle">
                    {row.cover ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleCoverClick(row.cover!);
                        }}
                        className="group flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0"
                        aria-label={`Edit cover for ${row.displayName}`}
                      >
                        <img
                          src={
                            row.cover.kind === "vault"
                              ? row.cover.resourcePath
                              : row.cover.url
                          }
                          alt={row.displayName}
                          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          handleCoverPlaceholderClick(event, row.file);
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[var(--text-muted)] transition hover:border-[var(--background-modifier-border-hover)] hover:text-[var(--text-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label={`Select cover for ${row.displayName}`}
                        disabled={isUploadingCover}
                      >
                        <Icon
                          name={isUploadingCover ? "loader-2" : "image"}
                          className={`h-5 w-5 ${
                            isUploadingCover ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    )}
                  </Table.Cell>
                <Table.Cell className="p-3 align-middle">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      variant="link"
                      tone="info"
                      className="group relative max-w-xl font-medium"
                      onClick={() => {
                        void handleOpenFile(row.file);
                      }}
                      aria-label={`Open ${row.displayName}`}
                    >
                      <span className="block max-w-full truncate">
                        {row.displayName}
                      </span>
                      <span
                        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-xl rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block"
                        role="presentation"
                      >
                        {row.displayName}
                      </span>
                    </Button>
                    <div
                      className="group relative max-w-xl text-xs text-[var(--text-muted)]"
                      aria-label={row.pathLabel}
                      tabIndex={0}
                    >
                      <span className="block truncate">{row.pathLabel}</span>
                      <span
                        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-xl rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block"
                        role="presentation"
                      >
                        {row.pathLabel}
                      </span>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="p-3 align-middle">
                  <div className="flex items-center gap-2 text-[var(--text-normal)]">
                    <Icon name={row.typeIcon} className="h-4 w-4" />
                    <span className="truncate text-sm">{row.typeLabel}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="p-3 align-middle text-[var(--text-normal)]">
                  {row.sizeLabel}
                </Table.Cell>
                <Table.Cell className="p-3 align-middle text-right">
                  <Button
                    icon="trash"
                    variant="link"
                    tone="danger"
                    aria-label={`Delete ${row.displayName}`}
                    onClick={() => {
                      void handleDeleteFile(row.file);
                    }}
                  />
                </Table.Cell>
              </Table.Row>
            );
          })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default VaultNotesView;
