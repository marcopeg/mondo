import { useCallback, useEffect, useState } from "react";
import type { EventRef, TFile } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import Badge from "@/components/ui/Badge";
import { useApp } from "@/hooks/use-app";
import { isMarkdownFile } from "@/utils/fileTypeFilters";

type NoteRow = {
  file: TFile;
  typeLabel: string;
  displayName: string;
  snippet: string;
  updatedLabel: string;
};

const MAX_SNIPPET_WORDS = 20;

const buildSnippet = (content: string): string => {
  const sanitized = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    return "";
  }

  const words = sanitized.split(" ");
  const snippetWords = words.slice(0, MAX_SNIPPET_WORDS);
  const snippet = snippetWords.join(" ");
  return words.length > snippetWords.length ? `${snippet}…` : snippet;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

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
      const type = typeof frontmatter.type === "string" ? frontmatter.type : "note";
      const showRaw = typeof frontmatter.show === "string" ? frontmatter.show : "";
      const displayName = showRaw.trim() || file.basename;

      let snippet = "";
      try {
        const content = await app.vault.cachedRead(file);
        snippet = buildSnippet(content);
      } catch (error) {
        console.debug("VaultNotesView: failed to read note", file.path, error);
      }

      results.push({
        file,
        typeLabel: type,
        displayName,
        snippet,
        updatedLabel: dateFormatter.format(file.stat.mtime),
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

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">Vault Notes</Typography>
      <div className="space-y-3">
        {isLoading && rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-[var(--text-muted)]">
            Loading notes…
          </div>
        ) : null}
        {!isLoading && rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-[var(--text-muted)]">
            No notes found.
          </div>
        ) : null}
        {rows.map((row) => (
          <button
            key={row.file.path}
            type="button"
            className="w-full rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4 text-left transition-colors hover:bg-[var(--background-secondary-alt, var(--background-secondary))]"
            onClick={() => {
              void handleOpenFile(row.file);
            }}
            title={row.displayName}
          >
            <div className="flex items-center justify-between gap-3">
              <Badge>{row.typeLabel}</Badge>
              <span className="text-xs text-[var(--text-muted)]">
                {row.updatedLabel}
              </span>
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-normal)]">
              <span className="block truncate">{row.displayName}</span>
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              <span className="block truncate">
                {row.snippet || "No preview available."}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VaultNotesView;
