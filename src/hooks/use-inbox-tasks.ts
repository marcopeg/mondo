import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { CRMFileType } from "@/types/CRMFileType";
import { TFile } from "obsidian";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import type {
  CachedMetadata,
  EventRef,
  HeadingCache,
  ListItemCache,
} from "obsidian";

const normalizeFolder = (folder: string | undefined | null): string =>
  normalizeFolderPath(folder ?? "");

const isInFolder = (path: string, folder: string): boolean => {
  if (!folder) {
    return true;
  }
  return path === folder || path.startsWith(`${folder}/`);
};

const extractTaskText = (line: string): string => {
  const sanitized = line.replace(/^\s*[-*+]\s*\[[^\]]*\]\s*/u, "");
  return sanitized.trim();
};

const DATE_TITLE_REGEX = /(\d{4})[-/](\d{2})[-/](\d{2})/;
const TIME_REGEX = /\b(\d{1,2}):(\d{2})\b/;

// Try to parse a date from frontmatter `date` field.
// Accepts formats like YYYY-MM-DD or ISO strings. Returns a Date at local midnight.
const parseDateFromFrontmatter = (
  cache: CachedMetadata | null
): Date | null => {
  const fmDate: unknown = cache?.frontmatter?.date as unknown;
  if (!fmDate) return null;

  // If it's a string, try ISO parse first, then simple YYYY-MM-DD
  if (typeof fmDate === "string") {
    const iso = new Date(fmDate);
    if (!Number.isNaN(iso.getTime())) {
      return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
    }
    const match = fmDate.match(DATE_TITLE_REGEX);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const candidate = new Date(year, month - 1, day);
        if (!Number.isNaN(candidate.getTime())) return candidate;
      }
    }
    return null;
  }

  // If Obsidian provided a Date-like object
  if (fmDate instanceof Date) {
    const d = fmDate as Date;
    if (!Number.isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  return null;
};

// Parse a date from a simple string like a filename/basename in the form YYYY-MM-DD
const parseDateFromSimpleString = (value: string): Date | null => {
  const match = value.match(DATE_TITLE_REGEX);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const candidate = new Date(year, month - 1, day);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
};

type ParsedTime = {
  hours: number;
  minutes: number;
};

const parseTimeFromTitle = (
  raw: string | null | undefined
): ParsedTime | null => {
  if (!raw) {
    return null;
  }
  const match = raw.match(TIME_REGEX);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return {
    hours,
    minutes,
  };
};

const getHeadingTitleForLine = (
  cache: CachedMetadata | null,
  lineNumber: number
): string | null => {
  const headings = cache?.headings as HeadingCache[] | undefined;
  if (!Array.isArray(headings) || headings.length === 0) {
    return null;
  }

  let candidate: HeadingCache | null = null;

  for (const heading of headings) {
    if (heading.position.start.line <= lineNumber) {
      if (
        !candidate ||
        heading.position.start.line >= candidate.position.start.line
      ) {
        candidate = heading;
      }
    }
  }

  if (!candidate) {
    return null;
  }

  const { heading } = candidate;
  if (typeof heading !== "string") {
    return null;
  }

  const trimmed = heading.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveTaskTimestamp = (
  file: TFile,
  cache: CachedMetadata | null,
  lineNumber: number
) => {
  const createdAt = new Date(
    typeof file.stat?.ctime === "number" ? file.stat.ctime : Date.now()
  );

  // Prefer frontmatter `date`; otherwise try parsing from filename (basename),
  // finally fall back to file creation date.
  const dateFromFM = parseDateFromFrontmatter(cache);
  const dateFromFileName = parseDateFromSimpleString(file.basename);
  const hasExplicitDate = Boolean(dateFromFM || dateFromFileName);

  const baseDate = dateFromFM ?? dateFromFileName ?? createdAt;
  const occurredAt = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    0,
    0,
    0,
    0
  );

  const headingTitle = getHeadingTitleForLine(cache, lineNumber);
  const parsedTime = parseTimeFromTitle(headingTitle);
  const hasExplicitTime = parsedTime !== null;

  if (parsedTime) {
    occurredAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  } else {
    occurredAt.setHours(
      createdAt.getHours(),
      createdAt.getMinutes(),
      createdAt.getSeconds(),
      createdAt.getMilliseconds()
    );
  }

  return {
    occurredAt,
    hasExplicitDate,
    hasExplicitTime,
  };
};

export type InboxTask = {
  id: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  raw: string;
  text: string;
  occurredAt: Date;
  hasExplicitDate: boolean;
  hasExplicitTime: boolean;
};

type PromoteTargetType = Extract<CRMFileType, "task" | "project" | "log">;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toTitleCase = (value: string): string => {
  const normalized = value
    .replace(/[`*_#>\[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => {
      if (!word) return "";
      const [first, ...rest] = word;
      return `${first.toUpperCase()}${rest.join("").toLowerCase()}`;
    })
    .join(" ");
};

const sanitizeFileName = (value: string): string =>
  value
    .replace(/[\\/]+/g, " ")
    .replace(/[:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ensureFolder = async (app: any, folderPath: string) => {
  if (!folderPath) return;
  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) return;
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

export const useInboxTasks = () => {
  const app = useApp();
  const inboxSetting = useSetting<string>("inbox", "Inbox");
  const inboxFolder = useMemo(
    () => normalizeFolder(inboxSetting),
    [inboxSetting]
  );
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    const collectTasksFromFile = async (file: TFile): Promise<InboxTask[]> => {
      const cache = app.metadataCache.getFileCache(file);
      const items = (cache?.listItems ?? []) as ListItemCache[];
      if (!items.length) {
        return [];
      }

      const openItems = items.filter((item) => item.task === " ");
      if (openItems.length === 0) {
        return [];
      }

      const content = await app.vault.cachedRead(file);
      const lines = content.split(/\r?\n/u);
      const metadata = cache ?? app.metadataCache.getFileCache(file) ?? null;

      return openItems.map((item) => {
        const lineNumber = item.position.start.line;
        const raw = lines[lineNumber] ?? "";
        const text = extractTaskText(raw);
        const timestampInfo = resolveTaskTimestamp(file, metadata, lineNumber);
        return {
          id: `${file.path}:${lineNumber}`,
          filePath: file.path,
          fileName: file.basename,
          lineNumber,
          raw,
          text,
          occurredAt: timestampInfo.occurredAt,
          hasExplicitDate: timestampInfo.hasExplicitDate,
          hasExplicitTime: timestampInfo.hasExplicitTime,
        };
      });
    };

    const compute = async () => {
      setIsLoading(true);
      try {
        const markdownFiles = app.vault.getMarkdownFiles();
        const inboxFiles = inboxFolder
          ? markdownFiles.filter((file) => isInFolder(file.path, inboxFolder))
          : markdownFiles;

        const collected = await Promise.all(
          inboxFiles.map((file) => collectTasksFromFile(file))
        );
        const results = collected.flat();

        results.sort((first, second) => {
          const diff = second.occurredAt.getTime() - first.occurredAt.getTime();
          if (diff !== 0) {
            return diff;
          }
          if (first.filePath !== second.filePath) {
            return first.filePath.localeCompare(second.filePath);
          }
          return first.lineNumber - second.lineNumber;
        });

        if (!disposed) {
          setTasks(results);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("useInboxTasks: failed to collect inbox tasks", error);
        if (!disposed) {
          setTasks([]);
          setIsLoading(false);
        }
      }
    };

    const handleChange = () => {
      void compute();
    };

    const refs: EventRef[] = [];
    refs.push(app.vault.on("create", handleChange));
    refs.push(app.vault.on("modify", handleChange));
    refs.push(app.vault.on("delete", handleChange));
    refs.push(app.vault.on("rename", handleChange));
    refs.push(app.metadataCache.on("changed", handleChange));

    void compute();

    return () => {
      disposed = true;
      for (const ref of refs) {
        try {
          app.vault.offref(ref);
        } catch {
          // ignore vault offref errors
        }
        try {
          app.metadataCache.offref(ref);
        } catch {
          // ignore metadata offref errors
        }
      }
    };
  }, [app, inboxFolder]);

  const completeTaskLine = useCallback(
    async (target: InboxTask, appendedText?: string) => {
      try {
        const abstractFile = app.vault.getAbstractFileByPath(target.filePath);
        if (!(abstractFile instanceof TFile)) {
          console.warn(
            "useInboxTasks: expected TFile at path",
            target.filePath
          );
          return;
        }

        const content = await app.vault.read(abstractFile);
        const lineBreak = content.includes("\r\n") ? "\r\n" : "\n";
        const lines = content.split(/\r?\n/u);
        // Prepare target text variants for precise matching
        const targetRaw = target.raw || "";
        const targetText = (target.text || targetRaw).trim();
        const targetCollapsed = targetText.replace(/\s+/g, " ").trim();

        const isTaskBulletLine = (line: string | undefined) =>
          typeof line === "string" && /^\s*[-+*]\s*\[[ xX]\]/.test(line);

        const isOpenTaskLine = (line: string | undefined) =>
          typeof line === "string" && /^\s*[-+*]\s*\[\s\]/.test(line);

        const normalize = (s: string) => s.trim();

        const collapseSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

        const matchesTarget = (line: string | undefined): boolean => {
          if (typeof line !== "string" || !isTaskBulletLine(line)) return false;
          if (line === targetRaw) return true;
          const lineText = normalize(extractTaskText(line || ""));
          if (lineText && targetText && lineText === targetText) return true;
          const lineCollapsed = collapseSpaces(extractTaskText(line || ""));
          if (
            lineCollapsed &&
            targetCollapsed &&
            lineCollapsed === targetCollapsed
          )
            return true;
          return false;
        };

        const tryUpdateAtIndex = (idx: number): boolean => {
          if (idx < 0 || idx >= lines.length) return false;
          const current = lines[idx];
          if (!current) return false;

          // Only operate on real markdown task bullets, not any [x] in frontmatter or text
          if (!isTaskBulletLine(current)) {
            return false;
          }

          // If it already looks completed, still allow appending the note.
          const alreadyChecked = /^\s*[-+*]\s*\[[xX]\]/.test(current);
          let updated = alreadyChecked
            ? current
            : current.replace(/^(\s*[-+*]\s*)\[[^\]]*\]/, "$1[x]");

          if (appendedText) {
            const add = appendedText.trim();
            if (add.length > 0 && !updated.includes(add)) {
              updated = `${updated.trimEnd()} ${add}`;
            }
          }

          if (updated !== current) {
            lines[idx] = updated;
          }
          return true;
        };

        // 1) Try the original index first (only if it matches the target text)
        if (
          !(
            matchesTarget(lines[target.lineNumber]) &&
            tryUpdateAtIndex(target.lineNumber)
          )
        ) {
          // 2) Search in a small window around the original index (to handle recent inserts)
          const windowRadius = 100;
          let fixed = false;
          for (let offset = 1; offset <= windowRadius; offset++) {
            const leftIdx = target.lineNumber - offset;
            if (matchesTarget(lines[leftIdx]) && tryUpdateAtIndex(leftIdx)) {
              fixed = true;
              break;
            }
            const rightIdx = target.lineNumber + offset;
            if (matchesTarget(lines[rightIdx]) && tryUpdateAtIndex(rightIdx)) {
              fixed = true;
              break;
            }
          }

          // 3) Fallback: search entire file for a task line whose extracted text matches
          if (!fixed) {
            let matchIndex = -1;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (matchesTarget(line)) {
                matchIndex = i;
                break;
              }
            }

            if (matchIndex !== -1) {
              if (!tryUpdateAtIndex(matchIndex)) {
                console.warn(
                  "useInboxTasks: found candidate line but failed to update",
                  target.filePath,
                  matchIndex
                );
                return;
              }
            } else {
              console.warn(
                "useInboxTasks: could not locate task line to complete",
                target.filePath,
                target.lineNumber
              );
              return;
            }
          }
        }

        const updatedContent = lines.join(lineBreak);
        if (updatedContent !== content) {
          await app.vault.modify(abstractFile, updatedContent);
        }

        setTasks((prev) => prev.filter((task) => task.id !== target.id));
      } catch (error) {
        console.error("useInboxTasks: failed to complete task", error);
      }
    },
    [app]
  );

  const toggleTask = useCallback(
    async (target: InboxTask) => {
      await completeTaskLine(target);
    },
    [completeTaskLine]
  );

  const promoteTask = useCallback(
    async (target: InboxTask, targetType: PromoteTargetType) => {
      try {
        const plugin = ((app as any)?.plugins?.plugins?.crm as any) ?? null;
        const settings = plugin?.settings ?? {};
        const rootPaths = settings.rootPaths ?? {};
        const templates = (settings.templates ?? {}) as Partial<
          Record<CRMFileType, string>
        >;

        const folderSetting = rootPaths[targetType] ?? "/";
        const normalizedFolder = normalizeFolderPath(folderSetting);

        if (normalizedFolder) {
          await ensureFolder(app, normalizedFolder);
        }

        const sourceText = target.text || target.raw || "";

        // Decide the timestamp to use for the new note
        // - For logs, inherit the Quick Task's resolved timestamp (date and time)
        // - Otherwise, use "now"
        const selectedDate =
          targetType === CRMFileType.LOG && target?.occurredAt
            ? new Date(target.occurredAt)
            : new Date();

        // Helper to format local date/time strings
        const pad = (n: number) => n.toString().padStart(2, "0");
        const localDateStr = `${selectedDate.getFullYear()}-${pad(
          selectedDate.getMonth() + 1
        )}-${pad(selectedDate.getDate())}`;
        const localTimeStrDot = `${pad(selectedDate.getHours())}.${pad(
          selectedDate.getMinutes()
        )}`;

        // Title strategy:
        // - For logs: "YYYY-MM-DD HH:mm" (so user can just hit Enter)
        // - For others: derive from task text (Title Case)
        const fallbackTitle =
          targetType === CRMFileType.PROJECT
            ? "New Project Task"
            : targetType === CRMFileType.LOG
            ? `${localDateStr} ${localTimeStrDot}`
            : "New Task";
        let titleBase =
          targetType === CRMFileType.LOG
            ? fallbackTitle
            : toTitleCase(sourceText).slice(0, 120) || fallbackTitle;
        const safeBase = sanitizeFileName(titleBase) || "Untitled";

        const slug = slugify(sourceText || safeBase);
        const baseFileName = safeBase.endsWith(".md")
          ? safeBase
          : `${safeBase}.md`;

        const buildFilePath = (name: string) =>
          normalizedFolder ? `${normalizedFolder}/${name}` : name;

        let fileName = baseFileName;
        let filePath = buildFilePath(fileName);
        let counter = 1;

        while (app.vault.getAbstractFileByPath(filePath)) {
          const suffix = `-${counter}`;
          const nameWithoutExt = baseFileName.replace(/\.md$/i, "");
          fileName = `${nameWithoutExt}${suffix}.md`;
          filePath = buildFilePath(fileName);
          counter += 1;
        }

        // Ensure title matches the actual chosen filename for logs,
        // so wiki links and note headings are consistent with the file basename.
        if (targetType === CRMFileType.LOG) {
          const finalBaseName = fileName.replace(/\.md$/i, "");
          titleBase = finalBaseName;
        }

        const templateSource = await getTemplateForType(
          app,
          templates,
          targetType
        );

        const iso = selectedDate.toISOString();
        const data = {
          title: titleBase,
          type: targetType,
          filename: fileName,
          slug: targetType === CRMFileType.LOG ? slugify(titleBase) : slug,
          // Use selectedDate for all date/time fields so logs inherit Quick Task timestamp
          date: iso.split("T")[0],
          // store a dot-time for convenience; template will also format from datetime
          time: localTimeStrDot,
          datetime: iso,
        };

        let content = renderTemplate(templateSource ?? "", data);

        if (!content.trim()) {
          content = `---\ntype: ${targetType}\n---\n`;
        }

        // Build a clean single-line body without checkbox/bullet
        const taskText = (
          target.text || extractTaskText(target.raw || "")
        ).trim();
        const templateBlock = content.endsWith("\n\n")
          ? content
          : `${content.trimEnd()}\n\n`;
        const sourceLinkTarget = target.filePath.replace(/\.md$/i, "");
        const sourceLinkLabel = target.fileName.replace(/[\[\]]/g, "");
        const backlink = `[[${sourceLinkTarget}|${sourceLinkLabel}]]`;
        const bodyLine = taskText || "";
        // Keep the wiki link outside HTML so Obsidian parses it; shrink only parentheses
        const metaLine = `_<small>(from </small>${backlink}<small>)</small>_`;
        const combined = `${templateBlock}${bodyLine}\n${metaLine}\n`;

        const created = await app.vault.create(filePath, combined);

        if (targetType === CRMFileType.TASK) {
          try {
            const selfParticipant = resolveSelfPerson(app, created.path);
            if (selfParticipant) {
              await addParticipantLink(app, created, selfParticipant.link);
            }
          } catch (error) {
            console.error(
              "useInboxTasks: failed to assign self participant",
              error
            );
          }
        }

        const linkTarget = created.basename;
        const linkLabel = titleBase.replace(/[\[\]]/g, "");
        const noteLink = `[[${linkTarget}|${linkLabel}]]`;

        await completeTaskLine(target, `(moved to: ${noteLink})`);

        const leaf = app.workspace.getLeaf(true);
        if (leaf) {
          await (leaf as any).openFile(created);
        }
      } catch (error) {
        console.error("useInboxTasks: failed to promote task", error);
      }
    },
    [app, completeTaskLine]
  );

  return {
    tasks,
    isLoading,
    toggleTask,
    promoteTask,
  };
};

export default useInboxTasks;
