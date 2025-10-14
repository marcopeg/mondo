import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { useActiveTab } from "@/hooks/use-active-tab";
import { MarkdownView } from "obsidian";

type HabitTrackerView = "streak" | "calendar";

type UseHabitTrackerArgs = {
  trackerKey?: string;
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
}: UseHabitTrackerArgs = {}): UseHabitTrackerResult => {
  const app = useApp();
  const { file } = useActiveTab();
  const targetFile = file?.file;
  const frontmatter = file?.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const trackerKey = requestedKey ?? "habits";
  const viewSettingKey = `${trackerKey}-view`;
  const ensureRef = useRef<string | null>(null);
  const [isEditingTargetFile, setIsEditingTargetFile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [trackedDays, setTrackedDays] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<HabitTrackerView>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    if (!targetFile) {
      setIsEditingTargetFile(false);
      return;
    }

    const evaluateEditingState = () => {
      const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
      if (!markdownView || !markdownView.file) {
        setIsEditingTargetFile(false);
        return;
      }

      if (markdownView.file.path !== targetFile.path) {
        setIsEditingTargetFile(false);
        return;
      }

      setIsEditingTargetFile(markdownView.getMode() === "source");
    };

    evaluateEditingState();

    const modeChangeRef = app.workspace.on("layout-change", evaluateEditingState);
    const leafChangeRef = app.workspace.on("active-leaf-change", evaluateEditingState);

    return () => {
      app.workspace.offref(modeChangeRef);
      app.workspace.offref(leafChangeRef);
    };
  }, [app, targetFile]);

  const ensureFrontmatter = useCallback(async () => {
    if (!targetFile) {
      setError("Unable to access the current note.");
      return;
    }

    const ensureKey = `${targetFile.path}|${trackerKey}`;
    if (ensureRef.current === ensureKey) return;

    if (isEditingTargetFile) {
      ensureRef.current = null;
      return;
    }

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
  }, [app.fileManager, isEditingTargetFile, targetFile, trackerKey, viewSettingKey]);

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

      if (isEditingTargetFile) {
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
    [app.fileManager, isEditingTargetFile, targetFile, trackerKey]
  );

  const persistViewMode = useCallback(
    async (next: HabitTrackerView) => {
      if (!targetFile) {
        setError("Unable to save habit tracker view.");
        return;
      }

      if (isEditingTargetFile) {
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
    [app.fileManager, isEditingTargetFile, targetFile, viewSettingKey]
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
