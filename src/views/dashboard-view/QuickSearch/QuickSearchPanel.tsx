import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice, TFile } from "obsidian";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/hooks/use-app";
import { useFiles } from "@/hooks/use-files";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { focusAndSelectTitle } from "@/utils/createLinkedNoteHelpers";
import { createEntityNoteFromInput } from "@/utils/createEntityNoteFromInput";
import type { MondoEntityType } from "@/types/MondoEntityTypes";
import type { TCachedFile } from "@/types/TCachedFile";

const MAX_SUGGESTIONS = 6;

type QuickSearchPanelProps = {
  entityType: MondoEntityType;
  icon?: string;
  title: string;
  onOpenAll: (type: string) => void;
};

type QuickSearchOption = {
  file: TFile;
  display: string;
  displayLower: string;
};

const buildOptions = (files: TCachedFile[]): QuickSearchOption[] =>
  files.map((entry) => {
    const display = getEntityDisplayName(entry);
    return {
      file: entry.file,
      display,
      displayLower: display.toLowerCase(),
    };
  });

export const QuickSearchPanel = ({
  entityType,
  icon,
  title,
  onOpenAll,
}: QuickSearchPanelProps) => {
  const app = useApp();
  const files = useFiles(entityType);
  const options = useMemo(() => buildOptions(files), [files]);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const blurTimeoutRef = useRef<number | null>(null);

  const trimmedQuery = query.trim();

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearBlurTimeout();
    };
  }, [clearBlurTimeout]);

  const handleFocus = useCallback(() => {
    clearBlurTimeout();
    setHighlightedIndex(-1);
    setIsFocused(true);
  }, [clearBlurTimeout]);

  const handleBlur = useCallback(() => {
    clearBlurTimeout();
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsFocused(false);
      setHighlightedIndex(-1);
      blurTimeoutRef.current = null;
    }, 120);
  }, [clearBlurTimeout]);

  const filteredOptions = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    const normalized = trimmedQuery.toLowerCase();
    return options
      .filter((option) => option.displayLower.includes(normalized))
      .slice(0, MAX_SUGGESTIONS);
  }, [options, trimmedQuery]);

  const openFile = useCallback(
    async (file: TFile, focusTitle: boolean) => {
      const leaf = app.workspace.getLeaf(true) || app.workspace.getLeaf(false);
      if (!leaf) {
        return;
      }
      await (leaf as any).openFile(file);
      if (focusTitle) {
        focusAndSelectTitle(leaf);
      }
    },
    [app]
  );

  const handleSuggestionSelect = useCallback(
    async (file: TFile) => {
      clearBlurTimeout();
      setQuery("");
      setIsFocused(false);
      setHighlightedIndex(-1);
      try {
        await openFile(file, false);
      } catch (error) {
        console.error(
          `QuickSearchPanel: failed to open ${entityType} note`,
          error
        );
        new Notice(`Failed to open ${title}.`);
      }
    },
    [clearBlurTimeout, entityType, openFile, title]
  );

  const handleSubmit = useCallback(async () => {
    if (isBusy) {
      return;
    }
    const normalized = trimmedQuery.toLowerCase();
    if (!normalized) {
      return;
    }

    setIsBusy(true);
    clearBlurTimeout();

    try {
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        await openFile(filteredOptions[highlightedIndex].file, false);
        setQuery("");
        setIsFocused(false);
        setHighlightedIndex(-1);
        return;
      }

      const exactMatches = options.filter(
        (option) => option.displayLower === normalized
      );

      if (exactMatches.length === 1) {
        await openFile(exactMatches[0].file, false);
        setQuery("");
        setIsFocused(false);
        setHighlightedIndex(-1);
        return;
      }

      const created = await createEntityNoteFromInput({
        app,
        entityType,
        input: trimmedQuery,
      });
      await openFile(created, true);
      setQuery("");
      setIsFocused(false);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error(
        `QuickSearchPanel: failed to process query for ${entityType}`,
        error
      );
      new Notice(`Failed to create ${title}.`);
    } finally {
      setIsBusy(false);
    }
  }, [
    app,
    clearBlurTimeout,
    entityType,
    filteredOptions,
    highlightedIndex,
    isBusy,
    openFile,
    options,
    title,
    trimmedQuery,
  ]);

  const hasQuery = trimmedQuery.length > 0;
  const showSuggestions = isFocused && hasQuery && filteredOptions.length > 0;

  useEffect(() => {
    if (!showSuggestions) {
      setHighlightedIndex(-1);
    }
  }, [showSuggestions]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [trimmedQuery]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredOptions.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex((current) => {
          const next = current + 1;
          if (next >= filteredOptions.length) {
            return filteredOptions.length - 1;
          }
          return next < 0 ? 0 : next;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex((current) => {
          const next = current - 1;
          return next < -1 ? -1 : next;
        });
        return;
      }

      if (event.key === "Enter") {
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          event.preventDefault();
          event.stopPropagation();
          void handleSuggestionSelect(filteredOptions[highlightedIndex].file);
          return;
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex(-1);
      }
    },
    [
      filteredOptions,
      handleSuggestionSelect,
      highlightedIndex,
      showSuggestions,
    ]
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-normal)]">
          {icon ? (
            <Icon name={icon} className="h-5 w-5 text-[var(--text-muted)]" />
          ) : null}
          <span>{title}</span>
        </div>
        <Button
          variant="link"
          icon="list"
          tone="info"
          onClick={() => onOpenAll(entityType)}
          aria-label={`Open all ${title}`}
        >
          list all
        </Button>
      </div>
      <form
        className="relative flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleSubmit();
        }}
      >
        <div className="flex items-center gap-2">
          <input
            className="setting-input flex-1 min-w-0"
            type="text"
            placeholder={`Search ${title}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={isBusy}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            onKeyDown={handleKeyDown}
          />
          <Button
            type="submit"
            icon="chevron-right"
            aria-label={`Go to ${title}`}
            className="flex h-9 w-9 items-center justify-center"
            disabled={isBusy || !hasQuery}
          />
        </div>
        {showSuggestions && (
          <div
            className="suggestion-container mod-search-suggestion absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto"
            role="listbox"
            style={{ width: "100%" }}
          >
            <div className="suggestion">
              {filteredOptions.map((option, index) => {
                const isSelected = index === highlightedIndex;
                return (
                  <div
                    key={option.file.path}
                    role="option"
                    aria-selected={isSelected}
                    className={`suggestion-item mod-complex search-suggest-item ${
                      isSelected ? "is-selected" : ""
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseLeave={() => setHighlightedIndex(-1)}
                    onClick={() => {
                      void handleSuggestionSelect(option.file);
                    }}
                  >
                    <div className="suggestion-content">
                      <div className="suggestion-title">
                        <span className="truncate">{option.display}</span>
                      </div>
                    </div>
                    <div className="suggestion-aux">
                      <Icon
                        name="chevron-right"
                        className="h-4 w-4 text-[var(--text-muted)]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickSearchPanel;
