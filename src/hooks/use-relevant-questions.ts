import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import type { ListItemCache, TFile } from "obsidian";
import { getMondoEntityConfig, isDailyNoteType, isJournalType } from "@/types/MondoFileType";

const CHECKBOX_STATUS_REGEX = /\[(?<status>[ xX-])\]/;

type RelevantQuestion = {
  id: string;
  file: TFile;
  filePath: string;
  fileName: string;
  noteTitle: string;
  noteType: string | null;
  checkboxText: string;
  headingTitle: string | null;
  lineStart: number;
  lineEnd: number;
  show: string | null;
  lastModified: number;
  created: number;
};

const stripCheckboxFromLine = (line: string): string => {
  const withoutBullet = line.replace(/^\s*([-*+]\s+)?/, "");
  return withoutBullet.replace(/^\[[^\]]\]\s*/, "");
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

const normalizeCheckboxText = (lines: string[]): string => {
  if (lines.length === 0) {
    return "";
  }

  const cleaned = lines.map((line, index) => {
    if (index === 0) {
      return stripCheckboxFromLine(line).trim();
    }
    return line.replace(/^\s{0,2}/, "").trim();
  });

  return cleaned.join(" ").trim();
};

type CachedHeading = {
  heading: string;
  level: number;
  position: { start: { line: number } };
};

const findHeadingForLine = (
  headings: CachedHeading[] | undefined,
  targetLine: number
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
      return { heading: heading.heading, level: heading.level };
    }
  }
  return null;
};

const buildQuestionId = (filePath: string, lineStart: number) =>
  `${filePath}#L${lineStart}`;

const getNoteTitle = (file: TFile, cache?: any): string => {
  const frontmatter = cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  
  const title = frontmatter?.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }
  
  return file.basename;
};

const getNoteShow = (cache?: any): string | null => {
  const frontmatter = cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  
  const show = frontmatter?.show;
  if (typeof show === "string" && show.trim()) {
    return show.trim();
  }
  
  return null;
};

const getNoteType = (cache?: any): string | null => {
  const frontmatter = cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  
  const type = frontmatter?.type || frontmatter?.mondoType;
  if (typeof type === "string" && type.trim()) {
    return type.trim();
  }
  
  return null;
};

export const useRelevantQuestions = (): {
  questions: RelevantQuestion[];
  isLoading: boolean;
  toggleQuestion: (question: RelevantQuestion) => Promise<void>;
  reload: () => void;
} => {
  const app = useApp();
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<{
    questions: RelevantQuestion[];
    isLoading: boolean;
  }>({ questions: [], isLoading: true });

  const reload = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadQuestions = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const allQuestions: RelevantQuestion[] = [];
        const allFiles = app.vault.getMarkdownFiles();

        for (const file of allFiles) {
          const cache = app.metadataCache.getFileCache(file);
          const noteTitle = getNoteTitle(file, cache);
          const noteType = getNoteType(cache);
          
          // Filter out daily notes and journals
          if (isDailyNoteType(noteType) || isJournalType(noteType)) {
            continue;
          }
          
          const noteShow = getNoteShow(cache);
          const raw = await app.vault.cachedRead(file);
          const rawLines = raw.split(/\r?\n/);

          const listItems = cache?.listItems as ListItemCache[] | undefined;
          if (!Array.isArray(listItems) || listItems.length === 0) {
            continue;
          }

          const headings = cache?.headings as CachedHeading[] | undefined;

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

            // Only include unchecked items (empty checkbox)
            if (checkboxState.trim()) {
              return;
            }

            const lines = extractListItemLines(raw, item);
            if (lines.length === 0) {
              return;
            }

            const checkboxText = normalizeCheckboxText(lines);
            if (!checkboxText) {
              return;
            }

            const heading = findHeadingForLine(
              headings,
              item.position.start.line
            );

            allQuestions.push({
              id: buildQuestionId(file.path, item.position.start.line),
              file: file,
              filePath: file.path,
              fileName: file.basename,
              noteTitle,
              noteType,
              checkboxText,
              headingTitle: heading?.heading ?? null,
              lineStart: item.position.start.line,
              lineEnd: item.position.end.line,
              show: noteShow,
              lastModified: file.stat.mtime,
              created: file.stat.ctime,
            });
          });
        }

        // Sort by last modified time (most recent first), fallback to created time
        allQuestions.sort((a, b) => {
          const aTime = a.lastModified || a.created;
          const bTime = b.lastModified || b.created;
          return bTime - aTime; // Descending order (most recent first)
        });

        if (!cancelled) {
          setState({ questions: allQuestions, isLoading: false });
        }
      } catch (error) {
        console.error("useRelevantQuestions: failed to load questions", error);
        if (!cancelled) {
          setState({ questions: [], isLoading: false });
        }
      }
    };

    void loadQuestions();

    // Listen to vault events for real-time updates
    const refs: any[] = [];
    refs.push(app.vault.on("create", () => void loadQuestions()));
    refs.push(app.vault.on("modify", () => void loadQuestions()));
    refs.push(app.vault.on("delete", () => void loadQuestions()));
    refs.push(app.metadataCache.on("changed", () => void loadQuestions()));

    return () => {
      cancelled = true;
      refs.forEach((ref) => app.vault.offref(ref));
      refs.forEach((ref) => app.metadataCache.offref(ref));
    };
  }, [app, refreshToken]);

  const toggleQuestion = useCallback(
    async (question: RelevantQuestion) => {
      try {
        const raw = await app.vault.read(question.file);
        const lineBreak = raw.includes("\r\n") ? "\r\n" : "\n";
        const lines = raw.split(/\r?\n/);
        
        const targetLine = lines[question.lineStart];
        if (!targetLine) {
          return;
        }

        // Add completion timestamp with date and time
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5); // HH:MM format
        const completionSuffix = ` _(Completed on ${date} at ${time})_`;

        // Replace the checkbox status and add timestamp
        const replaced = targetLine
          .replace(CHECKBOX_STATUS_REGEX, "[x]")
          .replace(/\s+$/u, "") + completionSuffix;
        
        if (replaced !== targetLine) {
          lines[question.lineStart] = replaced;
          const updated = lines.join(lineBreak);
          await app.vault.modify(question.file, updated);
          reload();
        }
      } catch (error) {
        console.error("useRelevantQuestions: failed to toggle question", error);
      }
    },
    [app, reload]
  );

  return useMemo(
    () => ({
      questions: state.questions,
      isLoading: state.isLoading,
      toggleQuestion,
      reload,
    }),
    [state.questions, state.isLoading, toggleQuestion, reload]
  );
};

export default useRelevantQuestions;
