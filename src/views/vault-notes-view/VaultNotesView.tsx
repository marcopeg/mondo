import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventRef, TFile } from "obsidian";
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

export const VaultNotesView = () => {
  const app = useApp();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      <Typography variant="h1">Vault Notes</Typography>
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
            {rows.map((row) => (
              <Table.Row
                key={row.file.path}
                className="border-t border-[var(--background-modifier-border)]"
              >
                <Table.Cell className="p-3 align-middle">
                  {row.cover ? (
                    <div className="h-12 w-12 overflow-hidden rounded-md border border-[var(--background-modifier-border)]">
                      <img
                        src={row.cover.kind === "vault" ? row.cover.resourcePath : row.cover.url}
                        alt={row.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-[var(--background-modifier-border)] text-[var(--text-muted)]">
                      <Icon name="file-text" className="h-5 w-5" />
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell className="p-3 align-middle">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      variant="link"
                      tone="info"
                      className="font-medium"
                      onClick={() => {
                        void handleOpenFile(row.file);
                      }}
                      title={row.displayName}
                    >
                      {row.displayName}
                    </Button>
                    <span className="max-w-xl truncate text-xs text-[var(--text-muted)]">
                      {row.pathLabel}
                    </span>
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
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default VaultNotesView;
