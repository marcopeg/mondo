import { useCallback, useMemo } from "react";
import { useApp } from "@/hooks/use-app";
import { useFiles } from "@/hooks/use-files";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { isMondoEntityType, MondoFileType, type MondoFileType as TMondoFileType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { resolveSelfPerson } from "@/utils/selfPerson";
import {
  normalizeParticipantLink,
  parseParticipants,
} from "@/utils/participants";
import type { App, TFile } from "obsidian";

const DATE_TITLE_REGEX = /(\d{4})[-/](\d{2})[-/](\d{2})/;
const TIME_REGEX = /\b(\d{1,2}):(\d{2})\b/;

// Using full MondoFileType so callers can promote to any configured entity type.

export type InboxTask = {
  id: string;
  file: TFile;
  filePath: string;
  fileName: string;
  text: string;
  occurredAt: Date;
  hasExplicitDate: boolean;
  hasExplicitTime: boolean;
};

type ParsedDateValue = {
  date: Date | null;
  hasTime: boolean;
};

const parseDateValue = (value: unknown): ParsedDateValue => {
  if (!value) {
    return { date: null, hasTime: false };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { date: null, hasTime: false };
    }
    const hasTime =
      value.getHours() !== 0 ||
      value.getMinutes() !== 0 ||
      value.getSeconds() !== 0 ||
      value.getMilliseconds() !== 0;
    return { date: new Date(value.getTime()), hasTime };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { date: null, hasTime: false };
    }
    const hasTime =
      parsed.getHours() !== 0 ||
      parsed.getMinutes() !== 0 ||
      parsed.getSeconds() !== 0 ||
      parsed.getMilliseconds() !== 0;
    return { date: parsed, hasTime };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { date: null, hasTime: false };
    }

    const simpleMatch = trimmed.match(DATE_TITLE_REGEX);
    if (simpleMatch && trimmed.length <= 10) {
      const year = Number(simpleMatch[1]);
      const month = Number(simpleMatch[2]);
      const day = Number(simpleMatch[3]);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day)
      ) {
        const candidate = new Date(year, month - 1, day);
        if (!Number.isNaN(candidate.getTime())) {
          return { date: candidate, hasTime: false };
        }
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const hasTime =
        TIME_REGEX.test(trimmed) ||
        trimmed.includes("T") ||
        trimmed.includes(" ");
      return { date: parsed, hasTime };
    }
  }

  return { date: null, hasTime: false };
};

const getTaskTimestamp = (
  cached: TCachedFile
): { occurredAt: Date; hasExplicitDate: boolean; hasExplicitTime: boolean } => {
  const fallback = new Date(
    typeof cached.file.stat?.ctime === "number"
      ? cached.file.stat.ctime
      : Date.now()
  );
  const frontmatter = cached.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  const { date, hasTime } = parseDateValue(frontmatter?.date);
  if (date) {
    return {
      occurredAt: date,
      hasExplicitDate: true,
      hasExplicitTime: hasTime,
    };
  }
  return {
    occurredAt: fallback,
    hasExplicitDate: false,
    hasExplicitTime: false,
  };
};

export const useInboxTasks = () => {
  const app = useApp();

  const quickTaskFilter = useCallback((cached: TCachedFile) => {
    const frontmatter = cached.cache?.frontmatter as
      | Record<string, unknown>
      | undefined;
    const participants = parseParticipants(frontmatter?.participants);
    if (participants.length > 0) {
      return false;
    }
    const status = typeof frontmatter?.status === "string"
      ? frontmatter.status.trim().toLowerCase()
      : "";
    if (status !== "quick") {
      return false;
    }
    return true;
  }, []);

  const filterOption = useMemo(
    () =>
      ((cached: TCachedFile) => quickTaskFilter(cached)) as (
        cached: TCachedFile,
        app: App
      ) => boolean,
    [quickTaskFilter]
  );

  const files = useFiles(MondoFileType.TASK, { filter: filterOption });

  const tasks = useMemo(() => {
    return files
      .map((cached) => {
        const { occurredAt, hasExplicitDate, hasExplicitTime } =
          getTaskTimestamp(cached);
        return {
          id: cached.file.path,
          file: cached.file,
          filePath: cached.file.path,
          fileName: cached.file.basename,
          text: getEntityDisplayName(cached),
          occurredAt,
          hasExplicitDate,
          hasExplicitTime,
        } satisfies InboxTask;
      })
      .sort((first, second) => {
        const diff = second.occurredAt.getTime() - first.occurredAt.getTime();
        if (diff !== 0) {
          return diff;
        }
        if (first.filePath !== second.filePath) {
          return first.filePath.localeCompare(second.filePath);
        }
        return 0;
      });
  }, [files]);

  const canAssignToSelf = useMemo(
    () => Boolean(resolveSelfPerson(app, null)),
    [app, files]
  );

  const markTaskDone = useCallback(
    async (target: InboxTask) => {
      await app.fileManager.processFrontMatter(target.file, (frontmatter) => {
        const fm = frontmatter as Record<string, unknown>;
        fm.status = "done";
        fm.completed = new Date().toISOString();
      });
    },
    [app]
  );

  const assignTaskToSelf = useCallback(
    async (target: InboxTask) => {
      const selfPerson = resolveSelfPerson(app, target.file.path);
      if (!selfPerson) {
        throw new Error("Self person is not configured");
      }

      await app.fileManager.processFrontMatter(target.file, (frontmatter) => {
        const fm = frontmatter as Record<string, unknown>;
        const existing = parseParticipants(fm.participants);
        const normalizedExisting = existing.map(normalizeParticipantLink);
        const normalizedSelf = normalizeParticipantLink(selfPerson.link);
        if (!normalizedExisting.includes(normalizedSelf)) {
          fm.participants = [...existing, selfPerson.link];
        } else {
          fm.participants = existing;
        }
        fm.status = "todo";
      });
    },
    [app]
  );

  const promoteTask = useCallback(
    async (target: InboxTask, targetType: TMondoFileType): Promise<TFile | null> => {
      // Assign to self when staying as a task
      if (targetType === "task") {
        await assignTaskToSelf(target);
        return target.file;
      }

      try {
        await app.fileManager.processFrontMatter(target.file, (frontmatter) => {
          const fm = frontmatter as Record<string, unknown>;
          // Honor the selected target type when it's a valid entity type
          if (typeof targetType === "string" && isMondoEntityType(targetType)) {
            (fm as Record<string, unknown>).mondoType = targetType;
            if (Object.prototype.hasOwnProperty.call(fm, "type")) {
              delete (fm as Record<string, unknown>).type;
            }
          } else {
            // If an unsupported/special type slips through, keep existing type unchanged
            // and avoid forcing it to legacy types like "log".
          }
          if ("status" in fm) {
            delete (fm as Record<string, unknown>).status;
          }
        });

        // return the modified file to the caller so they can open it if desired
        return target.file;
      } catch (error) {
        console.error("useInboxTasks: failed to promote quick task", error);
        return null;
      }
    },
    [app, assignTaskToSelf]
  );

  return {
    tasks,
    isLoading: false,
    toggleTask: markTaskDone,
    promoteTask,
    canAssignToSelf,
  };
};

export default useInboxTasks;
