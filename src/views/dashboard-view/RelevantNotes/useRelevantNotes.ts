import { useMemo } from "react";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";
import {
  extractDailyLinkReferences,
  extractDailyOpenedReferences,
  type DailyNoteReference,
} from "@/utils/daily-note-references";

export type RelevantNote = DailyNoteReference;

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

const addReference = (
  aggregated: Map<string, RelevantNote>,
  reference: DailyNoteReference
) => {
  const existing = aggregated.get(reference.path);
  if (existing) {
    existing.count += reference.count;
    return;
  }

  aggregated.set(reference.path, { ...reference });
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

      created.forEach((entry) => addReference(aggregated, entry));
      modified.forEach((entry) => addReference(aggregated, entry));
      opened.forEach((entry) => addReference(aggregated, entry));
    });

    const result = Array.from(aggregated.values());
    result.sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label);
    });

    return result;
  }, [app, logLimit, logs]);
};
