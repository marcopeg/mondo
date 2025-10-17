import { useMemo } from "react";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";
import {
  extractDailyLinkReferences,
  extractDailyOpenedReferences,
  type DailyNoteReference,
} from "@/utils/daily-note-references";

type ReferenceCategory = "created" | "modified" | "opened";

type ReferenceCounts = {
  created: number;
  modified: number;
  opened: number;
};

export type RelevantNote = {
  path: string;
  label: string;
  icon: string;
  type: DailyNoteReference["type"];
  counts: ReferenceCounts;
  lastCreated: string | null;
  lastModified: string | null;
  lastOpened: string | null;
};

const resolveTimestamp = (cached: TCachedFile): number => {
  const stat = cached.file.stat;
  const candidates = [stat?.mtime, stat?.ctime].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (candidates.length === 0) {
    return 0;
  }

  return Math.max(...candidates);
};

const extractIsoDate = (value: string): string | null => {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};

const normalizeDateValue = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const directMatch = extractIsoDate(trimmed);
    if (directMatch) {
      return directMatch;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }

    return trimmed;
  }

  return null;
};

const updateLastDate = (current: string | null, next: string | null): string | null => {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  return next > current ? next : current;
};

const ensureNote = (
  aggregated: Map<string, RelevantNote>,
  reference: DailyNoteReference
): RelevantNote => {
  const existing = aggregated.get(reference.path);
  if (existing) {
    return existing;
  }

  const created: RelevantNote = {
    path: reference.path,
    label: reference.label,
    icon: reference.icon,
    type: reference.type,
    counts: {
      created: 0,
      modified: 0,
      opened: 0,
    },
    lastCreated: null,
    lastModified: null,
    lastOpened: null,
  };

  aggregated.set(reference.path, created);
  return created;
};

const addReference = (
  aggregated: Map<string, RelevantNote>,
  reference: DailyNoteReference,
  category: ReferenceCategory,
  date: string | null
) => {
  const target = ensureNote(aggregated, reference);
  target.counts[category] += reference.count;

  if (category === "created") {
    target.lastCreated = updateLastDate(target.lastCreated, date);
    return;
  }

  if (category === "modified") {
    target.lastModified = updateLastDate(target.lastModified, date);
    return;
  }

  target.lastOpened = updateLastDate(target.lastOpened, date);
};

export const useRelevantNotes = (logLimit = 10): RelevantNote[] => {
  const app = useApp();
  const logs = useFiles("log");

  return useMemo(() => {
    if (!app) {
      return [];
    }

    const sorted = [...logs]
      .sort((left, right) => resolveTimestamp(right) - resolveTimestamp(left))
      .slice(0, logLimit);

    const aggregated = new Map<string, RelevantNote>();

    sorted.forEach((log) => {
      const sourcePath = log.file.path;
      const frontmatter = log.cache?.frontmatter as
        | Record<string, unknown>
        | undefined;
      if (!frontmatter) {
        return;
      }

      const noteDate =
        normalizeDateValue(frontmatter.date) ??
        extractIsoDate(log.file.basename) ??
        normalizeDateValue(log.file.stat?.mtime);

      const baseExcluded = new Set<string>([sourcePath]);

      const created = extractDailyLinkReferences(
        frontmatter.createdToday,
        app,
        sourcePath,
        baseExcluded
      );

      const createdPaths = new Set(created.map((entry) => entry.path));

      const modifiedRaw =
        (frontmatter.modifiedToday as unknown) ?? frontmatter.changedToday;
      const modifiedExcluded = new Set<string>([
        ...baseExcluded,
        ...createdPaths,
      ]);
      const modified = extractDailyLinkReferences(
        modifiedRaw,
        app,
        sourcePath,
        modifiedExcluded
      );

      const opened = extractDailyOpenedReferences(
        frontmatter.openedToday,
        app,
        sourcePath,
        baseExcluded
      );

      created.forEach((entry) =>
        addReference(aggregated, entry, "created", noteDate)
      );
      modified.forEach((entry) =>
        addReference(aggregated, entry, "modified", noteDate)
      );
      opened.forEach((entry) =>
        addReference(aggregated, entry, "opened", noteDate)
      );
    });

    const result = Array.from(aggregated.values());
    result.sort((left, right) => {
      const rightTotal =
        right.counts.created + right.counts.modified + right.counts.opened;
      const leftTotal =
        left.counts.created + left.counts.modified + left.counts.opened;
      if (rightTotal !== leftTotal) {
        return rightTotal - leftTotal;
      }
      return left.label.localeCompare(right.label);
    });

    return result;
  }, [app, logLimit, logs]);
};
