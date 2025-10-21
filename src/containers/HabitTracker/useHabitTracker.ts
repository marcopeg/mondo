import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { useActiveTab } from "@/hooks/use-active-tab";

type HabitTrackerView = "streak" | "calendar";

type UseHabitTrackerArgs = {
  trackerKey?: string;
  filePath?: string;
};

type UseHabitTrackerResult = {
  checkedDays: string[];
  viewMode: HabitTrackerView;
  error: string | null;
  toggleDay: (dayId: string) => void;
  toggleView: () => void;
};

const DEFAULT_VIEW_MODE: HabitTrackerView = "streak";

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateId = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseTrackedDays = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry instanceof Date) return formatDateId(entry);
        return String(entry);
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) =>
            typeof entry === "string" ? entry : String(entry ?? "")
          )
          .filter(Boolean);
      }
    } catch (error) {
      return value
        .split(/[,\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const sortDates = (dates: Set<string>) => {
  const sorted = Array.from(dates);
  sorted.sort();
  return sorted;
};

export const useHabitTracker = ({
  trackerKey: requestedKey,
  filePath,
}: UseHabitTrackerArgs = {}): UseHabitTrackerResult => {
  const app = useApp();
  const { file } = useActiveTab();
  const [explicitFile, setExplicitFile] = useState<TFile | null | undefined>(
    undefined
  );
  const [explicitFrontmatter, setExplicitFrontmatter] = useState<
    Record<string, unknown> | undefined
  >(undefined);

  const isResolvingExplicitFile = filePath ? explicitFile === undefined : false;
  const targetFile = filePath
    ? explicitFile ?? null
    : file?.file ?? null;
  const frontmatter = (filePath
    ? explicitFrontmatter
    : file?.cache?.frontmatter) as Record<string, unknown> | undefined;

  const trackerKey = requestedKey ?? "habits";
  const viewSettingKey = `${trackerKey}-view`;
  const ensureRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [trackedDays, setTrackedDays] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<HabitTrackerView>(DEFAULT_VIEW_MODE);

  const resolveExplicitFile = useCallback(() => {
    if (!filePath) {
      setExplicitFile(undefined);
      setExplicitFrontmatter(undefined);
      return;
    }

    const resolved = app.vault.getAbstractFileByPath(filePath);
    if (resolved instanceof TFile) {
      setExplicitFile(resolved);
      const cached = app.metadataCache.getFileCache(resolved);
      setExplicitFrontmatter(
        (cached?.frontmatter as Record<string, unknown> | undefined) ?? undefined
      );
      return;
    }

    setExplicitFile(null);
    setExplicitFrontmatter(undefined);
  }, [app.metadataCache, app.vault, filePath]);

  useEffect(() => {
    if (!filePath) {
      setExplicitFile(null);
      setExplicitFrontmatter(undefined);
      return;
    }

    resolveExplicitFile();
  }, [filePath, resolveExplicitFile]);

  useEffect(() => {
    if (!filePath) {
      return;
    }

    const handleMetadataChange = () => {
      resolveExplicitFile();
    };

    const metadataRef = app.metadataCache.on("changed", handleMetadataChange);
    const modifyRef = app.vault.on("modify", (changedFile) => {
      if (changedFile?.path === filePath) {
        resolveExplicitFile();
      }
    });

    return () => {
      app.metadataCache.offref(metadataRef);
      app.vault.offref(modifyRef);
    };
  }, [app.metadataCache, app.vault, filePath, resolveExplicitFile]);

  const ensureFrontmatter = useCallback(async () => {
    if (isResolvingExplicitFile) {
      return;
    }

    if (!targetFile) {
      setError("Unable to access the current note.");
      return;
    }

    const ensureKey = `${targetFile.path}|${trackerKey}`;
    if (ensureRef.current === ensureKey) return;

    try {
      await app.fileManager.processFrontMatter(targetFile, (fm) => {
        const parsed = parseTrackedDays(fm?.[trackerKey]);
        fm[trackerKey] = parsed;
        const rawView = fm?.[viewSettingKey];
        if (rawView !== "calendar" && rawView !== "streak") {
          fm[viewSettingKey] = DEFAULT_VIEW_MODE;
        }
      });
      ensureRef.current = ensureKey;
      setError(null);
    } catch (err) {
      console.error("useHabitTracker: failed to ensure frontmatter", err);
      ensureRef.current = null;
      setError("Unable to read habit tracker data.");
    }
  }, [
    app.fileManager,
    isResolvingExplicitFile,
    targetFile,
    trackerKey,
    viewSettingKey,
  ]);

  useEffect(() => {
    ensureRef.current = null;
  }, [targetFile, trackerKey]);

  useEffect(() => {
    void ensureFrontmatter();
  }, [ensureFrontmatter]);

  useEffect(() => {
    if (!frontmatter) return;
    const parsedDays = parseTrackedDays(frontmatter[trackerKey]);
    setTrackedDays(new Set(parsedDays));

    const requestedView = frontmatter[viewSettingKey];
    if (requestedView === "streak" || requestedView === "calendar") {
      setViewMode(requestedView);
    } else {
      setViewMode(DEFAULT_VIEW_MODE);
    }
  }, [frontmatter, trackerKey, viewSettingKey]);

  const persistTrackedDays = useCallback(
    async (next: Set<string>) => {
      if (!targetFile) {
        setError("Unable to save habit tracker data.");
        return;
      }

      try {
        await app.fileManager.processFrontMatter(targetFile, (fm) => {
          fm[trackerKey] = sortDates(next);
        });
        setError(null);
      } catch (err) {
        console.error("useHabitTracker: failed to persist tracked days", err);
        setError("Unable to save habit tracker data.");
      }
    },
    [app.fileManager, targetFile, trackerKey]
  );

  const persistViewMode = useCallback(
    async (next: HabitTrackerView) => {
      if (!targetFile) {
        setError("Unable to save habit tracker view.");
        return;
      }

      try {
        await app.fileManager.processFrontMatter(targetFile, (fm) => {
          fm[viewSettingKey] = next;
        });
      } catch (err) {
        console.error("useHabitTracker: failed to persist view mode", err);
        setError("Unable to save habit tracker view.");
      }
    },
    [app.fileManager, targetFile, viewSettingKey]
  );

  const toggleDay = useCallback(
    (dayId: string) => {
      setTrackedDays((prev) => {
        const next = new Set(prev);
        if (next.has(dayId)) {
          next.delete(dayId);
        } else {
          next.add(dayId);
        }
        void persistTrackedDays(next);
        return next;
      });
    },
    [persistTrackedDays]
  );

  const toggleView = useCallback(() => {
    setViewMode((current) => {
      const next = current === "streak" ? "calendar" : "streak";
      void persistViewMode(next);
      return next;
    });
  }, [persistViewMode]);

  const checkedDays = useMemo(() => sortDates(trackedDays), [trackedDays]);

  return {
    checkedDays,
    viewMode,
    error,
    toggleDay,
    toggleView,
  };
};

export type { HabitTrackerView, UseHabitTrackerArgs, UseHabitTrackerResult };
