import { App, TFile } from "obsidian";
import type Mondo from "@/main";

type Dir = "prev" | "next";

function normalizePath(p?: string) {
  if (!p) return "";
  return p === "/" ? "" : p.replace(/^\/+|\/+$/g, "");
}

function parseFrontmatterDate(content: string): string | null {
  const fmRegex = /^\s*---\n([\s\S]*?)\n---\r?\n?/;
  const m = content.match(fmRegex);
  if (!m) return null;
  const fm = m[1] || "";
  const dateMatch = fm.match(/(^|\n)\s*date\s*:\s*(\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) return dateMatch[2];
  return null;
}

async function listJournalFilesWithDates(app: App, journalRoot: string) {
  const files = app.vault.getFiles();
  const normalized = normalizePath(journalRoot);

  const entries: { path: string; date: string }[] = [];

  for (const f of files) {
    // Only markdown files
    if (!f.path.endsWith(".md")) continue;
    const inFolder =
      normalized === ""
        ? true
        : f.path === normalized || f.path.startsWith(normalized + "/");
    if (!inFolder) continue;
    try {
      const raw = await app.vault.read(f as TFile);
      const date = parseFrontmatterDate(raw);
      if (date) entries.push({ path: f.path, date });
    } catch (e) {
      // ignore read errors
    }
  }

  return entries;
}

// Open target path in the current active leaf (or a new leaf if none)
async function openPath(app: App, path: string) {
  const f = app.vault.getAbstractFileByPath(path) as TFile | null;
  if (!f) return false;
  const activeLeaf = app.workspace.activeLeaf ?? app.workspace.getLeaf(true);
  try {
    await activeLeaf.openFile(f);
    app.workspace.revealLeaf(activeLeaf);
    return true;
  } catch (e) {
    return false;
  }
}

export async function journalMove(app: App, plugin: Mondo, dir: Dir) {
  const settings = (plugin as any).settings || {};
  const journalSettings = settings.journal || {
    root: "Journal",
    entry: "YYYY-MM-DD",
  };
  const journalRoot = journalSettings.root || "Journal";

  // Get current active file and its frontmatter date
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    // fallback
    await (app as any).commands.executeCommandById("mondo:mondo-open-journal");
    return;
  }

  let currentDate: string | null = null;
  try {
    const raw = await app.vault.read(activeFile as TFile);
    currentDate = parseFrontmatterDate(raw);
  } catch (e) {
    currentDate = null;
  }

  if (!currentDate) {
    await (app as any).commands.executeCommandById("mondo:mondo-open-journal");
    return;
  }

  // Collect other journal files with dates
  const entries = await listJournalFilesWithDates(app, journalRoot);
  if (entries.length === 0) {
    await (app as any).commands.executeCommandById("mondo:mondo-open-journal");
    return;
  }

  // Sort by date ascending
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Find prev/next by date comparison
  const curDate = currentDate;

  let target: { path: string; date: string } | null = null;

  if (dir === "prev") {
    // largest date < curDate
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].date < curDate) {
        target = entries[i];
        break;
      }
    }
  } else {
    // smallest date > curDate
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].date > curDate) {
        target = entries[i];
        break;
      }
    }
  }

  if (!target) {
    if (dir === "prev") {
      // No previous entry: do nothing
      return;
    }

    // For 'next' fallback behavior: trigger open-journal command
    await (app as any).commands.executeCommandById("mondo:mondo-open-journal");
    return;
  }

  // Open the target file
  const opened = await openPath(app, target.path);
  if (!opened) {
    await (app as any).commands.executeCommandById("mondo:mondo-open-journal");
  }
}

// Factory helper to create a bound mover: const mover = journalMoveFactory(app, plugin); mover('prev')
export function journalMoveFactory(app: App, plugin: Mondo) {
  return async (dir: Dir) => journalMove(app, plugin, dir);
}
