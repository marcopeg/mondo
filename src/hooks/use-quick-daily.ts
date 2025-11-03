import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice, TFile, type ListItemCache } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { useFiles } from "@/hooks/use-files";
import {
  DAILY_NOTE_TYPE,
  type MondoFileType,
} from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type Mondo from "@/main";
import { addDailyLog } from "@/commands/daily.addLog";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

type TimeParts = {
  hours: number;
  minutes: number;
};

type QuickDailyEntry = {
  id: string;
  file: TFile;
  filePath: string;
  fileName: string;
  noteTitle: string;
  noteDate: Date | null;
  headingTitle: string | null;
  occurredAt: Date | null;
  displayText: string;
  fullText: string;
  lineStart: number;
  lineEnd: number;
};

export type QuickDailyState = {
  entries: QuickDailyEntry[];
  isLoading: boolean;
  addEntry: (text: string) => Promise<void>;
  markEntryDone: (entry: QuickDailyEntry) => Promise<void>;
  convertEntry: (
    entry: QuickDailyEntry,
    targetType: MondoFileType
  ) => Promise<void>;
  reload: () => void;
};

const DEFAULT_DAILY_SETTINGS = {
  note: "HH:MM",
  section: "h2",
  useBullets: true,
} as const;

const DATE_IN_TEXT = /(\d{4})[-/](\d{2})[-/](\d{2})/;

const INVALID_TITLE_CHARACTERS = /[<>:"/\\|?*#^\[\]]/g;
const CHECKBOX_STATUS_REGEX = /\[(?<status>[ xX-])\]/;

const ensureFolderExists = async (app: any, folderPath: string) => {
  if (!folderPath) {
    return;
  }

  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) {
    return;
  }

  const segments = folderPath.split("/");
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const present = app.vault.getAbstractFileByPath(current);
    if (!present) {
      // eslint-disable-next-line no-await-in-loop
      await app.vault.createFolder(current);
    }
  }
};

const sanitizeTitle = (value: string): string =>
  value.replace(INVALID_TITLE_CHARACTERS, "").replace(/\s+/g, " ").trim();

const sanitizeFileName = (value: string): string =>
  value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseDateFromString = (raw: string | null | undefined): Date | null => {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const match = trimmed.match(DATE_IN_TEXT);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  candidate.setHours(0, 0, 0, 0);
  return candidate;
};

const resolveNoteDate = (cached: TCachedFile): Date => {
  const frontmatterDate = parseDateFromString(
    (cached.cache?.frontmatter?.date as string | undefined) ?? null
  );
  if (frontmatterDate) {
    return frontmatterDate;
  }

  const titleDate = parseDateFromString(cached.file.basename);
  if (titleDate) {
    return titleDate;
  }

  const created =
    typeof cached.file.stat?.ctime === "number"
      ? new Date(cached.file.stat.ctime)
      : new Date();
  created.setHours(0, 0, 0, 0);
  return created;
};

const parseHeadingLevel = (raw: string | null | undefined): number => {
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  const match = normalized.match(/^h([1-6])$/);
  if (!match) {
    return 2;
  }
  const level = Number(match[1]);
  if (!Number.isNaN(level) && level >= 1 && level <= 6) {
    return level;
  }
  return 2;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildTimeRegex = (format: string): RegExp | null => {
  if (!format) {
    return null;
  }
  let pattern = "";
  for (let i = 0; i < format.length; ) {
    if (format.startsWith("HH", i)) {
      pattern += "(?<hours>\\d{2})";
      i += 2;
      continue;
    }
    if (format.startsWith("mm", i) || format.startsWith("MM", i)) {
      pattern += "(?<minutes>\\d{2})";
      i += 2;
      continue;
    }
    pattern += escapeRegex(format[i] ?? "");
    i += 1;
  }
  if (!pattern) {
    return null;
  }
  return new RegExp(`^${pattern}$`);
};

const parseTimeFromHeading = (
  heading: string | null,
  format: string
): TimeParts | null => {
  if (!heading) {
    return null;
  }
  const trimmed = heading.trim();
  if (!trimmed) {
    return null;
  }

  const regex = buildTimeRegex(format);
  if (regex) {
    const match = trimmed.match(regex);
    if (match?.groups) {
      const hours = Number(match.groups.hours ?? NaN);
      const minutes = Number(match.groups.minutes ?? NaN);
      if (!Number.isNaN(hours)) {
        return {
          hours,
          minutes: Number.isNaN(minutes) ? 0 : minutes,
        };
      }
    }
  }

  const fallback = trimmed.match(/(\d{1,2})(?::|\.|\s)?(\d{2})?/);
  if (!fallback) {
    return null;
  }

  const hours = Number(fallback[1]);
  const minutes = fallback[2] ? Number(fallback[2]) : 0;
  if (Number.isNaN(hours) || hours > 23 || hours < 0) {
    return null;
  }
  if (Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return { hours, minutes: 0 };
  }
  return { hours, minutes };
};

const combineDateAndTime = (
  date: Date | null,
  time: TimeParts | null
): Date | null => {
  if (!date) {
    return null;
  }
  if (!time) {
    return new Date(date.getTime());
  }
  const combined = new Date(date.getTime());
  combined.setHours(time.hours, time.minutes, 0, 0);
  return combined;
};

const extractListItemLines = (
  raw: string,
  item: ListItemCache
): string[] => {
  const lines = raw.split(/\r?\n/);
  const start = item.position.start.line;
  const end = item.position.end.line;
  const slice = lines.slice(start, end + 1);
  if (slice.length === 0) {
    return [];
  }
  return slice;
};

const stripCheckboxFromLine = (line: string): string => {
  const withoutBullet = line.replace(/^\s*([-*+]\s+)?/, "");
  return withoutBullet.replace(/^\[[^\]]\]\s*/, "");
};

const normalizeEntryText = (lines: string[]): {
  displayText: string;
  fullText: string;
} => {
  if (lines.length === 0) {
    return { displayText: "", fullText: "" };
  }

  const cleaned = lines.map((line, index) => {
    if (index === 0) {
      return stripCheckboxFromLine(line).trim();
    }
    return line.replace(/^\s{0,2}/, "").trim();
  });

  const displayText = cleaned[0] ?? "";
  const fullText = cleaned.join("\n").trim();
  return { displayText, fullText };
};

type CachedHeading = {
  heading: string;
  level: number;
  position: { start: { line: number } };
};

const findHeadingForLine = (
  headings: CachedHeading[] | undefined,
  targetLine: number,
  requiredLevel: number
): { heading: string; level: number } | null => {
  if (!Array.isArray(headings) || headings.length === 0) {
    return null;
  }
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i];
    if (!heading) {
      continue;
    }
    if (heading.position.start.line <= targetLine) {
      if (heading.level === requiredLevel) {
        return { heading: heading.heading, level: heading.level };
      }
      if (!requiredLevel) {
        return { heading: heading.heading, level: heading.level };
      }
    }
  }
  return null;
};

const buildEntryId = (filePath: string, lineStart: number) =>
  `${filePath}#${lineStart}`;

const toDailyNoteTitle = (cached: TCachedFile): string => {
  const frontmatterTitle = cached.cache?.frontmatter?.title;
  if (typeof frontmatterTitle === "string" && frontmatterTitle.trim()) {
    return frontmatterTitle.trim();
  }
  return cached.file.basename;
};

export const useQuickDailyEntries = (): QuickDailyState => {
  const app = useApp();
  const files = useFiles(DAILY_NOTE_TYPE);
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<{
    entries: QuickDailyEntry[];
    isLoading: boolean;
  }>({ entries: [], isLoading: true });

  const plugin = useMemo(() => {
    return (app as any)?.plugins?.getPlugin?.("mondo") as Mondo | undefined;
  }, [app]);

  const reload = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      if (!plugin) {
        setState({ entries: [], isLoading: false });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const dailySettings = plugin.settings?.daily ?? {};
        const noteFormat =
          typeof dailySettings.note === "string" && dailySettings.note.trim()
            ? dailySettings.note.trim()
            : DEFAULT_DAILY_SETTINGS.note;
        const sectionLevel = parseHeadingLevel(dailySettings.section);

        const allEntries: QuickDailyEntry[] = [];

        for (const cached of files) {
          const noteDate = resolveNoteDate(cached);
          const dailyTitle = toDailyNoteTitle(cached);
          const raw = await app.vault.cachedRead(cached.file);
          const rawLines = raw.split(/\r?\n/);

          const listItems = cached.cache?.listItems as ListItemCache[] | undefined;
          if (!Array.isArray(listItems) || listItems.length === 0) {
            continue;
          }

          const headings = cached.cache?.headings as CachedHeading[] | undefined;

          listItems.forEach((item) => {
            if (!item) {
              return;
            }

            const baseLine = rawLines[item.position.start.line] ?? "";
            const checkboxMatch = baseLine.match(CHECKBOX_STATUS_REGEX);
            if (!checkboxMatch) {
              return;
            }
            const checkboxState =
              checkboxMatch.groups?.status ?? checkboxMatch[1] ?? "";

            if (checkboxState.trim()) {
              return;
            }

            const lines = extractListItemLines(raw, item);
            if (lines.length === 0) {
              return;
            }

            const { displayText, fullText } = normalizeEntryText(lines);
            if (!displayText) {
              return;
            }

            const heading = findHeadingForLine(
              headings,
              item.position.start.line,
              sectionLevel
            );
            const time = parseTimeFromHeading(heading?.heading ?? null, noteFormat);
            const occurredAt = combineDateAndTime(noteDate, time);

            allEntries.push({
              id: buildEntryId(cached.file.path, item.position.start.line),
              file: cached.file,
              filePath: cached.file.path,
              fileName: cached.file.basename,
              noteTitle: dailyTitle,
              noteDate,
              headingTitle: heading?.heading ?? null,
              occurredAt,
              displayText,
              fullText,
              lineStart: item.position.start.line,
              lineEnd: item.position.end.line,
            });
          });
        }

        allEntries.sort((a, b) => {
          const aTime = a.occurredAt?.getTime() ?? 0;
          const bTime = b.occurredAt?.getTime() ?? 0;
          if (aTime !== bTime) {
            return aTime - bTime;
          }
          if (a.filePath !== b.filePath) {
            return a.filePath.localeCompare(b.filePath);
          }
          return a.lineStart - b.lineStart;
        });

        if (!cancelled) {
          setState({ entries: allEntries, isLoading: false });
        }
      } catch (error) {
        console.error("useQuickDailyEntries: failed to load daily entries", error);
        if (!cancelled) {
          setState({ entries: [], isLoading: false });
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [app, files, plugin, refreshToken]);

  const addEntry = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      const targetPlugin = plugin;
      if (!targetPlugin) {
        new Notice("Mondo plugin is not ready yet");
        return;
      }
      try {
        await addDailyLog(app, targetPlugin, { text: trimmed, mode: "task" });
        reload();
      } catch (error) {
        console.error("useQuickDailyEntries: failed to add entry", error);
        new Notice("Failed to add daily entry");
      }
    },
    [app, plugin, reload]
  );

  const modifyDailyNote = useCallback(
    async (
      entry: QuickDailyEntry,
      updater: (lines: string[], lineBreak: string) => string[]
    ) => {
      const raw = await app.vault.read(entry.file);
      const lineBreak = raw.includes("\r\n") ? "\r\n" : "\n";
      const lines = raw.split(/\r?\n/);
      const updatedLines = updater([...lines], lineBreak);
      const updated = updatedLines.join(lineBreak);
      if (updated !== raw) {
        await app.vault.modify(entry.file, updated);
      }
    },
    [app]
  );

  const markEntryDone = useCallback(
    async (entry: QuickDailyEntry) => {
      try {
        await modifyDailyNote(entry, (lines) => {
          const target = lines[entry.lineStart];
          if (!target) {
            return lines;
          }

          const replaced = target.replace(CHECKBOX_STATUS_REGEX, "[x]");
          if (replaced !== target) {
            lines[entry.lineStart] = replaced;
          }

          return lines;
        });
        reload();
      } catch (error) {
        console.error("useQuickDailyEntries: failed to mark entry done", error);
        new Notice("Failed to complete daily entry");
      }
    },
    [modifyDailyNote, reload]
  );

  const convertEntry = useCallback(
    async (entry: QuickDailyEntry, targetType: MondoFileType) => {
      try {
        const pluginSettings = (plugin?.settings as {
          rootPaths?: Record<string, string>;
        }) ?? { rootPaths: {} };
        const rootPaths = pluginSettings.rootPaths ?? {};
        const normalizedTarget =
          (typeof targetType === "string" && targetType.trim()) || "note";
        const folderSetting =
          rootPaths[normalizedTarget] ?? rootPaths.note ?? "/";
        const normalizedFolder = normalizeFolderPath(folderSetting);
        if (normalizedFolder) {
          await ensureFolderExists(app, normalizedFolder);
        }

        const words = entry.displayText.split(/\s+/).filter(Boolean);
        const truncatedTitle = words.slice(0, 10).join(" ");
        const baseTitle = truncatedTitle || entry.displayText || "Untitled";
        const sanitizedTitle = sanitizeTitle(baseTitle) || "Untitled";
        const sanitizedFileBase = sanitizeFileName(sanitizedTitle) || "untitled";
        const buildPath = (fileName: string) =>
          normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

        let attempt = 0;
        let filePath = "";
        while (attempt < 1000) {
          const suffix = attempt === 0 ? "" : `-${attempt}`;
          const candidateName = `${sanitizedFileBase}${suffix || ""}.md`;
          const candidatePath = buildPath(candidateName);
          const existing = app.vault.getAbstractFileByPath(candidatePath);
          if (!existing) {
            filePath = candidatePath;
            break;
          }
          attempt += 1;
        }

        if (!filePath) {
          throw new Error("Unable to determine file path for new note");
        }

        const dailyLink = entry.headingTitle
          ? `[[${entry.file.basename}#${entry.headingTitle}]]`
          : `[[${entry.file.basename}]]`;

        const bodyLines: string[] = [
          "---",
          `type: ${normalizedTarget}`,
          `title: ${sanitizedTitle}`,
          "---",
          "",
        ];
        const noteBody = entry.fullText.trim();
        if (noteBody && noteBody !== sanitizedTitle) {
          bodyLines.push(noteBody, "");
        }
        bodyLines.push(`(Imported from: ${dailyLink})`, "");

        const created = await app.vault.create(filePath, bodyLines.join("\n"));

        await modifyDailyNote(entry, (lines) => {
          const next = [...lines];
          const targetLine = next[entry.lineStart] ?? "";
          const withCheckbox = targetLine.replace(
            CHECKBOX_STATUS_REGEX,
            "[x]"
          );
          const trimmedLine = withCheckbox.replace(/\s+$/u, "");
          const linkSuffix = `(Moved to: [[${created.basename}]])`;
          const hasLink = trimmedLine.includes(linkSuffix);
          next[entry.lineStart] = hasLink
            ? withCheckbox
            : `${trimmedLine} ${linkSuffix}`;
          return next;
        });

        reload();
      } catch (error) {
        console.error("useQuickDailyEntries: failed to convert entry", error);
        new Notice("Failed to convert daily entry");
      }
    },
    [app, modifyDailyNote, plugin, reload]
  );

  return useMemo(
    () => ({
      entries: state.entries,
      isLoading: state.isLoading,
      addEntry,
      markEntryDone,
      convertEntry,
      reload,
    }),
    [state.entries, state.isLoading, addEntry, markEntryDone, convertEntry, reload]
  );
};

export default useQuickDailyEntries;
