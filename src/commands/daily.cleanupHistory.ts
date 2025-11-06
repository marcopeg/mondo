import { App, Notice, TFile, type CachedMetadata, moment } from "obsidian";
import type momentModule from "moment";
import type Mondo from "@/main";
import { isDailyNoteType } from "@/types/MondoFileType";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { DEFAULT_MONDO_DAILY_SETTINGS } from "@/types/MondoOtherPaths";

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

const getMoment = (): typeof momentModule => moment as unknown as typeof momentModule;

const toStartOfDay = (date: Date): Date => {
  const clone = new Date(date.getTime());
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const parseDateValue = (value: unknown, entryFormat: string): Date | null => {
  const momentFactory = getMoment();

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return toStartOfDay(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoAttempt = momentFactory(trimmed, momentFactory.ISO_8601, true);
  if (isoAttempt.isValid()) {
    return toStartOfDay(isoAttempt.toDate());
  }

  const normalizedFormat = entryFormat.trim();
  if (normalizedFormat) {
    const formattedAttempt = momentFactory(trimmed, normalizedFormat, true);
    if (formattedAttempt.isValid()) {
      return toStartOfDay(formattedAttempt.toDate());
    }
  }

  return null;
};

const resolveDailyNoteDate = (
  file: TFile,
  cache: CachedMetadata | null | undefined,
  entryFormat: string
): Date | null => {
  const frontmatterDate = parseDateValue(cache?.frontmatter?.date, entryFormat);
  if (frontmatterDate) {
    return frontmatterDate;
  }

  const titleDate = parseDateValue(file.basename, entryFormat);
  if (titleDate) {
    return titleDate;
  }

  const created = file.stat?.ctime;
  if (typeof created === "number" && !Number.isNaN(created)) {
    return toStartOfDay(new Date(created));
  }

  return null;
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
  await plugin.loadSettings();

  const dailySettings = ((plugin as any).settings?.daily ?? {}) as {
    historyRetentionDays?: number;
    entry?: string;
    root?: string;
  };

  const retentionSetting = Number.parseInt(
    String(dailySettings.historyRetentionDays ?? ""),
    10
  );

  if (Number.isNaN(retentionSetting) || retentionSetting <= 0) {
    new Notice("Daily history retention is not configured.");
    return;
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - retentionSetting);

  const dailyRoot = normalizeFolderPath(
    dailySettings.root ?? DEFAULT_MONDO_DAILY_SETTINGS.root
  );
  const entryFormat =
    typeof dailySettings.entry === "string" && dailySettings.entry.trim()
      ? dailySettings.entry
      : DEFAULT_MONDO_DAILY_SETTINGS.entry;
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
    const date = resolveDailyNoteDate(file, cache, entryFormat);
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
