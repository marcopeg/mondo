import { useMemo } from "react";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { DAILY_NOTE_TYPE, LEGACY_DAILY_NOTE_TYPE } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import {
  extractDailyLinkReferences,
  extractDailyOpenedReferences,
  type DailyNoteReference,
} from "@/utils/daily-note-references";
import { getDailyNoteState } from "@/utils/daily-note-state";

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
  lastCreatedTimestamp: number | null;
  lastModifiedTimestamp: number | null;
  lastOpenedTimestamp: number | null;
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

// Keep track of last date strings for backward compatibility with legacy data
// that doesn't have timestamps. This is used as a fallback display value.
const updateLastDate = (current: string | null, next: string | null): string | null => {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  return next > current ? next : current;
};

const updateLastTimestamp = (current: number | null, next: number | null): number | null => {
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
    lastCreatedTimestamp: null,
    lastModifiedTimestamp: null,
    lastOpenedTimestamp: null,
  };

  aggregated.set(reference.path, created);
  return created;
};

const addReference = (
  aggregated: Map<string, RelevantNote>,
  reference: DailyNoteReference,
  category: ReferenceCategory,
  date: string | null,
  timestamp: number | null
) => {
  const target = ensureNote(aggregated, reference);
  target.counts[category] += reference.count;

  if (category === "created") {
    target.lastCreated = updateLastDate(target.lastCreated, date);
    target.lastCreatedTimestamp = updateLastTimestamp(target.lastCreatedTimestamp, timestamp);
    return;
  }

  if (category === "modified") {
    target.lastModified = updateLastDate(target.lastModified, date);
    target.lastModifiedTimestamp = updateLastTimestamp(target.lastModifiedTimestamp, timestamp);
    return;
  }

  target.lastOpened = updateLastDate(target.lastOpened, date);
  target.lastOpenedTimestamp = updateLastTimestamp(target.lastOpenedTimestamp, timestamp);
};

export const useRelevantNotes = (logLimit = 10): RelevantNote[] => {
  const app = useApp();
  const dailyNotes = useFiles(DAILY_NOTE_TYPE);
  const legacyLogs = useFiles(LEGACY_DAILY_NOTE_TYPE);
  const combinedNotes = useMemo(() => {
    if (legacyLogs.length === 0) {
      return dailyNotes;
    }
    const merged = new Map<string, (typeof dailyNotes)[number]>();
    dailyNotes.forEach((entry) => {
      merged.set(entry.file.path, entry);
    });
    legacyLogs.forEach((entry) => {
      if (!merged.has(entry.file.path)) {
        merged.set(entry.file.path, entry);
      }
    });
    return Array.from(merged.values());
  }, [dailyNotes, legacyLogs]);

  return useMemo(() => {
    if (!app) {
      return [];
    }

    const sorted = [...combinedNotes]
      .sort((left, right) => resolveTimestamp(right) - resolveTimestamp(left))
      .slice(0, logLimit);

    const aggregated = new Map<string, RelevantNote>();

    sorted.forEach((entry) => {
      const sourcePath = entry.file.path;
      const frontmatter = entry.cache?.frontmatter as
        | Record<string, unknown>
        | undefined;
      if (!frontmatter) {
        return;
      }

      const noteDate =
        normalizeDateValue(frontmatter.date) ??
        extractIsoDate(entry.file.basename) ??
        normalizeDateValue(entry.file.stat?.mtime);

      const baseExcluded = new Set<string>([sourcePath]);

      const dailyState = getDailyNoteState(frontmatter);

      const created = extractDailyLinkReferences(
        dailyState.created,
        app,
        sourcePath,
        baseExcluded
      );

      const createdPaths = new Set(created.map((entry) => entry.path));

      const modifiedExcluded = new Set<string>([
        ...baseExcluded,
        ...createdPaths,
      ]);
      const modified = extractDailyLinkReferences(
        dailyState.changed,
        app,
        sourcePath,
        modifiedExcluded
      );

      // Extract opened references without excluding created/modified files
      // because we still need to track lastOpened dates even if we don't count them
      const opened = extractDailyOpenedReferences(
        dailyState.opened,
        app,
        sourcePath,
        baseExcluded
      );

      // Track files seen on this day across all categories to avoid double-counting.
      // A file should only contribute one "hit" per day, regardless of how many
      // actions (created/modified/opened) occurred.
      const seenOnThisDay = new Set<string>();

      created.forEach((entry) => {
        addReference(aggregated, entry, "created", noteDate, entry.timestamp ?? null);
        seenOnThisDay.add(entry.path);
      });
      modified.forEach((entry) => {
        addReference(aggregated, entry, "modified", noteDate, entry.timestamp ?? null);
        seenOnThisDay.add(entry.path);
      });
      opened.forEach((entry) => {
        // Only count opened if not already counted as created or modified on this day
        if (!seenOnThisDay.has(entry.path)) {
          addReference(aggregated, entry, "opened", noteDate, entry.timestamp ?? null);
        } else {
          // Still update lastOpened date and timestamp even if we don't increment the count
          const target = ensureNote(aggregated, entry);
          target.lastOpened = updateLastDate(target.lastOpened, noteDate);
          target.lastOpenedTimestamp = updateLastTimestamp(target.lastOpenedTimestamp, entry.timestamp ?? null);
        }
      });
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
  }, [app, combinedNotes, logLimit]);
};
