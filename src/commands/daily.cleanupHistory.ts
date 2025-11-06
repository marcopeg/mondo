import { App, Notice, TFile, type CachedMetadata } from "obsidian";
import type Mondo from "@/main";
import { isDailyNoteType } from "@/types/MondoFileType";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

const isInFolder = (path: string, folder: string): boolean => {
  if (!folder) {
    return true;
  }
  return path === folder || path.startsWith(`${folder}/`);
};

const readFrontmatterType = (cache: CachedMetadata | null | undefined): string | null => {
  const rawType = cache?.frontmatter?.mondoType ?? cache?.frontmatter?.type;
  if (typeof rawType === "string" && rawType.trim()) {
    return rawType.trim().toLowerCase();
  }
  return null;
};

const parseDateKey = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, yearText, monthText, dayText] = match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10) - 1;
  const day = Number.parseInt(dayText, 10);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const removeFrontmatter = (content: string): string => {
  if (!content.startsWith("---")) {
    return content;
  }
  const match = content.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/);
  if (!match) {
    return content;
  }
  return content.slice(match[0].length);
};

const isBodyEmpty = (content: string): boolean => removeFrontmatter(content).trim().length === 0;

export const cleanupDailyHistory = async (app: App, plugin: Mondo) => {
  const retentionSetting = Number.parseInt(
    String((plugin as any).settings?.daily?.historyRetentionDays ?? ""),
    10
  );

  if (Number.isNaN(retentionSetting) || retentionSetting <= 0) {
    new Notice("Daily history retention is not configured.");
    return;
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - retentionSetting);

  const dailyRoot = normalizeFolderPath((plugin as any).settings?.daily?.root ?? "Daily");
  const candidates: TFile[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    if (!isInFolder(file.path, dailyRoot)) {
      continue;
    }
    const cache = app.metadataCache.getFileCache(file);
    const type = readFrontmatterType(cache);
    if (!isDailyNoteType(type)) {
      continue;
    }
    const date = parseDateKey(cache?.frontmatter?.date);
    if (!date) {
      continue;
    }
    if (date < cutoff) {
      candidates.push(file);
    }
  }

  if (candidates.length === 0) {
    new Notice("No daily notes exceeded the retention period.");
    return;
  }

  let cleanedCount = 0;
  let deletedCount = 0;

  for (const file of candidates) {
    let hadMondoState = false;

    try {
      const cache = app.metadataCache.getFileCache(file);
      if (cache?.frontmatter && Object.prototype.hasOwnProperty.call(cache.frontmatter, "mondoState")) {
        await app.fileManager.processFrontMatter(file, (frontmatter) => {
          if (Object.prototype.hasOwnProperty.call(frontmatter, "mondoState")) {
            delete (frontmatter as Record<string, unknown>).mondoState;
            hadMondoState = true;
          }
        });
      }
    } catch (error) {
      console.error("Mondo: Failed to clean mondoState from", file.path, error);
      continue;
    }

    try {
      const content = await app.vault.read(file);
      if (isBodyEmpty(content)) {
        await app.vault.delete(file);
        deletedCount += 1;
        continue;
      }
      if (hadMondoState) {
        cleanedCount += 1;
      }
    } catch (error) {
      console.error("Mondo: Failed to finalize cleanup for", file.path, error);
    }
  }

  const updatedCount = cleanedCount;
  const summaryParts = [] as string[];
  if (updatedCount > 0) {
    summaryParts.push(`${updatedCount} note${updatedCount === 1 ? "" : "s"} cleaned`);
  }
  if (deletedCount > 0) {
    summaryParts.push(`${deletedCount} empty note${deletedCount === 1 ? "" : "s"} deleted`);
  }

  const message =
    summaryParts.length > 0
      ? `Cleanup Daily History: ${summaryParts.join(", ")}.`
      : "Cleanup Daily History completed.";
  new Notice(message);
};

export default cleanupDailyHistory;
