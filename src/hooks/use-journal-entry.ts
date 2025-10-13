import { useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import type { TFile } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

interface UseJournalResult {
  current: TCachedFile | null;
  prev: TCachedFile | null;
  next: TCachedFile | null;
}

/**
 * Parse a date from a filename basename using a simple format.
 * Supported tokens: YYYY, MM, DD, HH, mm. We only use YYYY/MM/DD for ordering.
 * If parsing fails, returns null.
 *
 * Note: This is intentionally lightweight and assumes common formats like
 * "YYYY-MM-DD". If the project's settings use unusual formats this will
 * fall back to attempting ISO parse of the basename.
 */
function parseDateFromBasename(
  basename: string,
  format = "YYYY-MM-DD"
): Date | null {
  // Try to build a regex from the format
  try {
    const tokenMap: Record<string, string> = {
      YYYY: "(\\d{4})",
      MM: "(\\d{2})",
      DD: "(\\d{2})",
      HH: "(\\d{2})",
      mm: "(\\d{2})",
    };

    // Escape regex special chars (we'll replace tokens afterwards)
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let rxStr = escapeRegex(format);

    // Replace tokens with groups (preserve order of tokens in the format)
    Object.keys(tokenMap).forEach((tok) => {
      rxStr = rxStr.split(tok).join(tokenMap[tok]);
    });

    // Allow optional trailing chars (like file extension or extra text)
    const rx = new RegExp("^" + rxStr);
    const match = basename.match(rx);
    if (match) {
      // Extract year/month/day from captured groups by looking up token positions
      const yMatch =
        format.indexOf("YYYY") >= 0
          ? match[format.split(/(YYYY|MM|DD|HH|mm)/).indexOf("YYYY") + 1]
          : undefined;
      // Simpler approach: find groups by searching format tokens in order
      const parts: Record<string, string> = {};
      const tokenOrder = format.match(/(YYYY|MM|DD|HH|mm)/g) || [];
      let groupIndex = 1;
      for (const t of tokenOrder) {
        parts[t] = match[groupIndex++] || "";
      }

      const y = parts["YYYY"] ? parseInt(parts["YYYY"], 10) : NaN;
      const m = parts["MM"] ? parseInt(parts["MM"], 10) : NaN;
      const d = parts["DD"] ? parseInt(parts["DD"], 10) : NaN;

      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        // Use local date (ignore time)
        const dt = new Date(y, m - 1, d);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }
  } catch (e) {
    // fall through to ISO attempt
  }

  // Fallback: try to parse the basename as ISO date
  const iso = new Date(basename);
  if (!Number.isNaN(iso.getTime())) return iso;
  return null;
}

/**
 * Hook to compute current / previous / next journal entries (by date) based on
 * the currently active file in the workspace.
 *
 * Returns TCachedFile objects (file + optional cache) for ease of use in UI.
 */
export function useJournalEntry(): UseJournalResult {
  const app = useApp();

  // Read user settings for journal root and filename format
  const journalRoot = useSetting<string>("journal.root", "Journal");
  const entryFormat = useSetting<string>("journal.entry", "YYYY-MM-DD");

  const [state, setState] = useState<UseJournalResult>({
    current: null,
    prev: null,
    next: null,
  });

  useEffect(() => {
    let mounted = true;

    const inFolder = (filePath: string, folderPath: string) => {
      if (!folderPath || folderPath === "/") return true;
      const norm = folderPath.replace(/^\/+|\/+$/g, "");
      if (!norm) return true;
      return filePath === norm || filePath.startsWith(`${norm}/`);
    };

    const compute = () => {
      const active = app.workspace.getActiveFile();

      // Gather all markdown files inside journal root
      const all = app.vault.getMarkdownFiles();
      const candidates: { file: TFile; date: Date }[] = [];

      for (const f of all) {
        if (!inFolder(f.path, journalRoot)) continue;
        const basename = f.basename; // filename without extension
        const dt = parseDateFromBasename(basename, entryFormat);
        if (dt) candidates.push({ file: f, date: dt });
      }

      // Sort by date ascending
      candidates.sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime() ||
          a.file.path.localeCompare(b.file.path)
      );

      if (!active) {
        if (mounted) setState({ current: null, prev: null, next: null });
        return;
      }

      // If active file is not in journal root or not parseable, clear
      if (!inFolder(active.path, journalRoot)) {
        if (mounted) setState({ current: null, prev: null, next: null });
        return;
      }

      const index = candidates.findIndex((c) => c.file.path === active.path);

      const makeCached = (f: TFile) => ({
        file: f,
        cache: app.metadataCache.getFileCache(f) || undefined,
      });

      const current =
        index >= 0 ? makeCached(candidates[index].file) : makeCached(active);
      const prev = index > 0 ? makeCached(candidates[index - 1].file) : null;
      const next =
        index >= 0 && index < candidates.length - 1
          ? makeCached(candidates[index + 1].file)
          : null;

      if (mounted) setState({ current, prev, next });
    };

    // React to workspace file switches and vault/meta changes
    const refs: any[] = [];
    refs.push(app.workspace.on("file-open", compute));
    refs.push(app.vault.on("create", compute));
    refs.push(app.vault.on("modify", compute));
    refs.push(app.vault.on("delete", compute));
    refs.push(app.vault.on("rename", compute));
    refs.push(app.metadataCache.on("changed", compute));

    // Initial compute
    compute();

    return () => {
      mounted = false;
      // remove refs
      try {
        for (const r of refs) {
          app.workspace?.offref?.(r);
          app.vault?.offref?.(r);
          app.metadataCache?.offref?.(r);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [app, journalRoot, entryFormat]);

  return state;
}

export default useJournalEntry;
