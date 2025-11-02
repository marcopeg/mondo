import { useMemo, useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";
import { Cover } from "@/components/ui/Cover";

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
  row: MondoEntityListRow;
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
    <div className="mx-auto">
      <Cover
        src={resourcePath}
        alt={cover.name}
        size={64}
        strategy="cover"
        coverClassName="border border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
        editLabel={`Open ${row.label}`}
        onEditCover={handleOpen}
      />
    </div>
  );
};
