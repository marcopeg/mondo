import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventRef, TFile } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import Table from "@/components/ui/Table";
import { useApp } from "@/hooks/use-app";
import { formatBytes } from "@/utils/formatBytes";
import { isOtherVaultFile } from "@/utils/fileTypeFilters";
import { ReadableDate } from "@/components/ui/ReadableDate";

type FileRow = {
  file: TFile;
  typeLabel: string;
  icon: string;
  sizeLabel: string;
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

  const rows = useMemo((): FileRow[] =>
    files.map((file) => {
      const extension = normalizeExtension(file);
      const icon = ICON_MAP[extension] ?? "file";
      const createdValue = file.stat.ctime;

      return {
        file,
        typeLabel: extension.toUpperCase(),
        icon,
        sizeLabel: formatBytes(file.stat.size ?? 0),
        createdValue,
        pathLabel: file.path,
      };
    }),
  [files]);

  const handleOpenFile = useCallback(
    async (file: TFile) => {
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(file);
    },
    [app]
  );

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">Vault Files</Typography>
      <div className="overflow-hidden rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)]">
        <Table>
          <thead className="bg-[var(--background-secondary-alt, var(--background-secondary))]">
            <tr>
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Title
              </Table.HeadCell>
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Path
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
                    <a
                      href="#"
                      className="group inline-flex max-w-full items-center gap-2 text-left text-[var(--interactive-accent)] hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleOpenFile(row.file);
                      }}
                      title={row.file.basename}
                    >
                      <Icon name="external-link" className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{row.file.basename}</span>
                    </a>
                  </Table.Cell>
                  <Table.Cell className="p-3 align-middle text-[var(--text-muted)]">
                    <span className="block max-w-xs truncate md:max-w-sm lg:max-w-md" title={row.pathLabel}>
                      {row.pathLabel}
                    </span>
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
