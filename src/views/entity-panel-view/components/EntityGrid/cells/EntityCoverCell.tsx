import { useMemo, useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { CRMEntityListRow } from "@/views/entity-panel-view/useEntityPanels";

const extractFirstEntry = (value: unknown): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = extractFirstEntry(entry);
      if (result) return result;
    }
    return null;
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  return null;
};

type EntityCoverCellProps = {
  value: unknown;
  row: CRMEntityListRow;
  column: string;
};

const parseWikiLink = (raw: string) => {
  const inner = raw.slice(2, -2);
  const [target] = inner.split("|");
  return target.trim();
};

export const EntityCoverCell = ({ value, row }: EntityCoverCellProps) => {
  const app = useApp();

  const cover = useMemo(() => {
    const raw = extractFirstEntry(value);
    if (!raw) return null;

    let target = raw;
    if (raw.startsWith("[[") && raw.endsWith("]]")) {
      target = parseWikiLink(raw);
    }

    const file = app.vault.getAbstractFileByPath(target);
    if (file instanceof TFile) {
      return file;
    }

    const normalized = target.replace(/\.md$/i, "");
    const dest = app.metadataCache.getFirstLinkpathDest(normalized, "");
    return dest instanceof TFile ? dest : null;
  }, [app, value]);

  const handleOpen = useCallback(async () => {
    // Open the entity note (row.path), not the cover file
    const file = app.vault.getAbstractFileByPath(row.path);
    if (!(file instanceof TFile)) return;
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
    app.workspace.revealLeaf(leaf);
  }, [app, row.path]);

  if (!cover) {
    // No placeholder: keep the cell empty as requested
    return null;
  }

  const resourcePath = app.vault.getResourcePath(cover);

  return (
    <div
      onClick={handleOpen}
      className="relative block h-16 w-16 cursor-pointer overflow-hidden"
    >
      <img
        src={resourcePath}
        alt={cover.name}
        className="h-full w-full object-cover"
      />
    </div>
  );
};
