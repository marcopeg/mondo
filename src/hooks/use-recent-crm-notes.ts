import { useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";
import {
  CRMFileManager,
  type CRMFilesChangedEvent,
} from "@/utils/CRMFileManager";
import {
  CRM_FILE_TYPES,
  type CRMFileType,
} from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";

export type RecentCRMNote = {
  path: string;
  label: string;
  type: CRMFileType;
  modified: Date;
};

export type RecentCRMNotesResult = {
  notes: RecentCRMNote[];
  total: number;
  hasMore: boolean;
};

const EMPTY_RECORD: Record<string, unknown> = {};

const getLabel = (cached: TCachedFile): string => {
  const frontmatter = (cached.cache?.frontmatter ??
    EMPTY_RECORD) as Record<string, unknown>;
  const rawShow = frontmatter.show;
  if (typeof rawShow === "string") {
    const trimmed = rawShow.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return cached.file.basename ?? cached.file.name;
};

const resolveTimestamp = (cached: TCachedFile): number => {
  const stat = cached.file.stat;
  const candidates = [
    typeof stat?.mtime === "number" ? stat.mtime : 0,
    typeof stat?.ctime === "number" ? stat.ctime : 0,
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) {
    return Date.now();
  }

  return Math.max(...candidates);
};

const toRecentNote = (cached: TCachedFile, type: CRMFileType): RecentCRMNote => {
  const timestamp = resolveTimestamp(cached);
  return {
    path: cached.file.path,
    label: getLabel(cached),
    type,
    modified: new Date(timestamp),
  };
};

const collectRecentNotes = (
  manager: CRMFileManager,
  limit: number,
  type?: CRMFileType | null
): RecentCRMNotesResult => {
  const types = type ? [type] : CRM_FILE_TYPES;
  const entries = types.flatMap((entryType) =>
    manager
      .getFiles(entryType)
      .map((cached) => toRecentNote(cached, entryType))
  );

  entries.sort(
    (left, right) => right.modified.getTime() - left.modified.getTime()
  );

  const bounded = limit > 0 && entries.length > limit;
  const notes = bounded ? entries.slice(0, limit) : entries;

  return {
    notes,
    total: entries.length,
    hasMore: bounded,
  };
};

export const useRecentCRMNotes = (
  limit = 10,
  type?: CRMFileType | null
): RecentCRMNotesResult => {
  const app = useApp();
  const [result, setResult] = useState<RecentCRMNotesResult>({
    notes: [],
    total: 0,
    hasMore: false,
  });

  useEffect(() => {
    const manager = CRMFileManager.getInstance(app);

    const update = () => {
      setResult(collectRecentNotes(manager, limit, type));
    };

    update();

    const listener = (_event: CRMFilesChangedEvent) => {
      update();
    };

    manager.addListener(listener);

    return () => {
      manager.removeListener(listener);
    };
  }, [app, limit, type]);

  return result;
};
