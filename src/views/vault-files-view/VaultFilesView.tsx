import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventRef, TFile } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { useApp } from "@/hooks/use-app";
import { formatBytes } from "@/utils/formatBytes";
import { isOtherVaultFile } from "@/utils/fileTypeFilters";
import { ReadableDate } from "@/components/ui/ReadableDate";

type FileRow = {
  file: TFile;
  typeLabel: string;
  icon: string;
  sizeLabel: string;
  size: number;
  createdValue: number;
  pathLabel: string;
};

const ICON_MAP: Record<string, string> = {
  pdf: "file-text",
  csv: "table",
  xlsx: "table",
  xls: "table",
  doc: "file-text",
  docx: "file-text",
  ppt: "presentation",
  pptx: "presentation",
  keynote: "presentation",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  mp4: "film",
  mov: "film",
  avi: "film",
  mkv: "film",
};

const normalizeExtension = (file: TFile) => file.extension.toLowerCase();

export const VaultFilesView = () => {
  const app = useApp();
  const [files, setFiles] = useState<TFile[]>([]);

  const collect = useCallback(() => {
    const otherFiles = app.vault
      .getFiles()
      .filter((file) => isOtherVaultFile(file))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    setFiles(otherFiles);
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
          console.debug("VaultFilesView: failed to remove vault listener", error);
        }
      }
    };
  }, [app, collect]);

  const rows = useMemo(
    (): FileRow[] =>
      files.map((file) => {
        const extension = normalizeExtension(file);
        const icon = ICON_MAP[extension] ?? "file";
        const createdValue = file.stat.ctime;
        const size = file.stat.size ?? 0;
        const parentPath = file.parent?.path ?? "";
        const pathLabel = parentPath.length > 0 ? parentPath : "/";

        return {
          file,
          typeLabel: extension.toUpperCase(),
          icon,
          sizeLabel: formatBytes(size),
          size,
          createdValue,
          pathLabel,
        };
      }),
    [files]
  );

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
        setFiles((previous) =>
          previous.filter((entry) => entry.path !== file.path)
        );
      } catch (error) {
        console.debug("VaultFilesView: failed to delete file", file.path, error);
      }
    },
    [app]
  );

  const totals = useMemo(() => {
    const totalSize = rows.reduce((acc, row) => acc + row.size, 0);
    return {
      totalCount: rows.length,
      totalSizeLabel: formatBytes(totalSize),
    };
  }, [rows]);

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-[var(--background-modifier-border)] pb-3">
        <Typography variant="h1">Files</Typography>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total Files
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
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                File
              </Table.HeadCell>
              <Table.HeadCell className="w-40 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Type
              </Table.HeadCell>
              <Table.HeadCell className="w-32 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Size
              </Table.HeadCell>
              <Table.HeadCell className="w-48 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Created
              </Table.HeadCell>
              <Table.HeadCell className="w-16 p-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <span className="sr-only">Actions</span>
              </Table.HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Table.Cell
                  colSpan={5}
                  className="p-6 text-center text-[var(--text-muted)]"
                >
                  No files found.
                </Table.Cell>
              </tr>
            ) : (
              rows.map((row) => (
                <Table.Row
                  key={row.file.path}
                  className="border-t border-[var(--background-modifier-border)]"
                >
                  <Table.Cell className="p-3 align-middle">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      variant="link"
                      tone="info"
                      className="group relative max-w-xl font-medium"
                      onClick={() => {
                        void handleOpenFile(row.file);
                      }}
                      aria-label={`Open ${row.file.basename}`}
                    >
                      <span className="block max-w-full truncate">
                        {row.file.basename}
                      </span>
                      <span
                        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-xl rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block"
                        role="presentation"
                      >
                        {row.file.basename}
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
                      <Icon name={row.icon} className="h-4 w-4" />
                      <span className="truncate text-sm">{row.typeLabel}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-[var(--text-normal)]">
                    {row.sizeLabel}
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-[var(--text-muted)]">
                    <ReadableDate value={row.createdValue} fallback="—" />
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-right">
                    <Button
                      icon="trash"
                      variant="link"
                      tone="danger"
                      aria-label={`Delete ${row.file.basename}`}
                      onClick={() => {
                        void handleDeleteFile(row.file);
                      }}
                    />
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default VaultFilesView;
