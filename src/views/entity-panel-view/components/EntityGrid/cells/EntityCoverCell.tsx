import { useMemo, useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { CRMEntityListRow } from "@/views/entity-panel-view/useCRMEntityPanel";

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

export const EntityCoverCell = ({ value }: EntityCoverCellProps) => {
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
    if (!cover) return;
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(cover);
    app.workspace.revealLeaf(leaf);
  }, [app, cover]);

  if (!cover) {
    return <span>—</span>;
  }

  const resourcePath = app.vault.getResourcePath(cover);

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)]"
    >
      <img
        src={resourcePath}
        alt={cover.name}
        className="h-full w-full object-cover"
      />
    </button>
  );
};
