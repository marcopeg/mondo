import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import {
  getTemplateForType,
  renderTemplate,
} from "@/utils/CRMTemplates";
import { CRMFileType } from "@/types/CRMFileType";
import { TFile } from "obsidian";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";
import type {
  CachedMetadata,
  EventRef,
  HeadingCache,
  ListItemCache,
} from "obsidian";

const normalizeFolder = (folder: string | undefined | null): string => {
  if (!folder) {
    return "";
  }
  return folder.replace(/^\/+|\/+$/g, "");
};

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

const getNoteTitle = (file: TFile, cache: CachedMetadata | null): string => {
  const fmTitle = cache?.frontmatter?.title;
  if (typeof fmTitle === "string") {
    const trimmed = fmTitle.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  const headings = cache?.headings as HeadingCache[] | undefined;
  if (Array.isArray(headings) && headings.length > 0) {
    const primary = headings[0];
    const headingTitle = primary?.heading;
    if (typeof headingTitle === "string") {
      const trimmed = headingTitle.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return file.basename;
};

const parseDateFromTitle = (title: string): Date | null => {
  const match = title.match(DATE_TITLE_REGEX);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
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

const parseTimeFromTitle = (raw: string | null | undefined): ParsedTime | null => {
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
      if (!candidate || heading.position.start.line >= candidate.position.start.line) {
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

  const noteTitle = getNoteTitle(file, cache);
  const dateFromTitle = parseDateFromTitle(noteTitle);
  const hasExplicitDate = dateFromTitle !== null;

  const occurredAt = hasExplicitDate
    ? new Date(
        dateFromTitle!.getFullYear(),
        dateFromTitle!.getMonth(),
        dateFromTitle!.getDate(),
        0,
        0,
        0,
        0
      )
    : new Date(createdAt.getTime());

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

type PromoteTargetType = Extract<CRMFileType, "task" | "project">;

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
  const inboxFolder = useMemo(() => normalizeFolder(inboxSetting), [inboxSetting]);
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
      const metadata =
        (cache ?? app.metadataCache.getFileCache(file)) ?? null;

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
          const diff =
            second.occurredAt.getTime() - first.occurredAt.getTime();
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
        const lines = content.split(/\r?\n/u);
        const currentLine = lines[target.lineNumber];

        if (currentLine === undefined) {
          console.warn(
            "useInboxTasks: missing line for task",
            target.filePath,
            target.lineNumber
          );
          return;
        }

        const updatedLine = currentLine.replace(/\[\s\]/, "[x]");
        if (updatedLine === currentLine) {
          // nothing to toggle (maybe already completed)
          return;
        }

        lines[target.lineNumber] = updatedLine;
        let finalLine = updatedLine;
        if (appendedText) {
          const trimmed = appendedText.trim();
          if (trimmed.length > 0 && !updatedLine.includes(trimmed)) {
            finalLine = `${updatedLine.trimEnd()} ${trimmed}`;
            lines[target.lineNumber] = finalLine;
          }
        }

        const updatedContent = lines.join("\n");
        await app.vault.modify(abstractFile, updatedContent);

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
        const plugin =
          ((app as any)?.plugins?.plugins?.crm as any) ?? null;
        const settings = plugin?.settings ?? {};
        const rootPaths = settings.rootPaths ?? {};
        const templates = (settings.templates ??
          {}) as Partial<Record<CRMFileType, string>>;

        const folderSetting = rootPaths[targetType] ?? "/";
        const normalizedFolder =
          folderSetting === "/"
            ? ""
            : folderSetting.replace(/^\/+/, "").replace(/\/+$/, "");

        if (normalizedFolder) {
          await ensureFolder(app, normalizedFolder);
        }

        const sourceText = target.text || target.raw || "";
        const titleBase =
          toTitleCase(sourceText).slice(0, 120) ||
          (targetType === "project" ? "New Project Task" : "New Task");
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

        const templateSource = await getTemplateForType(
          app,
          templates,
          targetType
        );

        const now = new Date();
        const iso = now.toISOString();
        const data = {
          title: titleBase,
          type: targetType,
          filename: fileName,
          slug,
          date: iso.split("T")[0],
          time: iso.slice(11, 16),
          datetime: iso,
        };

        let content = renderTemplate(templateSource ?? "", data);

        if (!content.trim()) {
          const safeTitle = titleBase.replace(/"/g, '\\"');
          content = `---\ntype: ${targetType}\nshow: "${safeTitle}"\n---\n`;
        }

        const body = (target.raw || target.text || "").trim();
        const templateBlock = content.endsWith("\n\n")
          ? content
          : `${content.trimEnd()}\n\n`;
        const sourceLinkTarget = target.filePath.replace(/\.md$/i, "");
        const sourceLinkLabel = target.fileName.replace(/[\[\]]/g, "");
        const backlink = `From note: [[${sourceLinkTarget}|${sourceLinkLabel}]]`;
        const bodySection = body ? `${backlink}\n\n${body}\n` : `${backlink}\n`;
        const combined = `${templateBlock}${bodySection}`;

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
