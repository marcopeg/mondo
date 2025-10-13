import React, { useCallback, useEffect, useRef, useState } from "react";
import { App, AbstractInputSuggest } from "obsidian";

interface AutoCompleteProps {
  values: string[];
  onSelect: (val: string) => void;
  placeholder?: string;
  className?: string;
}

class ArraySuggest extends AbstractInputSuggest<string> {
  private inputEl: HTMLInputElement;
  private values: string[];
  private onPick: (val: string) => void;
  private clearInput: (hideSuggestions?: boolean) => void;

  constructor(
    inputEl: HTMLInputElement,
    values: string[],
    onPick: (val: string) => void,
    clearInput: (hideSuggestions?: boolean) => void
  ) {
    // Pull the global Obsidian app instance (available at runtime)
    // @ts-ignore - global 'app' injected by Obsidian runtime
    const app = (window as any).app as App;
    super(app, inputEl);
    this.inputEl = inputEl;
    this.values = values;
    this.onPick = onPick;
    this.clearInput = clearInput;
  }

  getSuggestions(query: string): string[] {
    const q = query ?? "";
    return this.values.filter((v) => v.toLowerCase().includes(q.toLowerCase()));
  }

  renderSuggestion(value: string, el: HTMLElement) {
    el.setText(value);
  }

  selectSuggestion(value: string) {
    try {
      this.onPick(value);
    } finally {
      this.clearInput(false);
      this.close();
    }
  }
}

// Local fallback for useApp when obsidian doesn't provide it in the types
function useAppFallback(): App {
  // @ts-ignore - global 'app' injected by Obsidian runtime
  return (window as any).app as App;
}

export function AutoComplete({
  values,
  onSelect,
  placeholder,
  className,
}: AutoCompleteProps) {
  const app = useAppFallback();
  const ref = useRef<HTMLInputElement | null>(null);
  const suggestRef = useRef<ArraySuggest | null>(null);
  const navUsedRef = useRef(false); // user used arrow navigation
  const suggestHiddenRef = useRef(false); // user pressed Escape to hide suggestions
  const [inputValue, setInputValue] = useState("");

  const clearInput = useCallback(
    (hideSuggestions: boolean = true) => {
      const input = ref.current;
      if (!input) return;
      input.value = "";
      setInputValue("");
      navUsedRef.current = false;
      suggestHiddenRef.current = hideSuggestions;
      if (hideSuggestions) {
        try {
          suggestRef.current?.close();
        } catch {}
      }
      input.focus();
    },
    []
  );

  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    // Tear down any previous suggest
    if (suggestRef.current) {
      try {
        suggestRef.current.close();
      } catch {}
      suggestRef.current = null;
    }

    // Create new suggest
    const suggest = new ArraySuggest(input, values ?? [], onSelect, clearInput);
    suggestRef.current = suggest;

    return () => {
      if (suggestRef.current) {
        try {
          suggestRef.current.close();
        } catch {}
        suggestRef.current = null;
      }
    };
  }, [app, values, onSelect, clearInput]);

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type="text"
        className={[className ?? "setting-input", "pr-9"].filter(Boolean).join(" ")}
        placeholder={placeholder}
        onInput={(event) => {
          // any input resets navigation / hidden state
          navUsedRef.current = false;
          suggestHiddenRef.current = false;
          const target = event.target as HTMLInputElement;
          setInputValue(target.value);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          // Track arrow navigation to allow selecting current highlighted suggestion
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            navUsedRef.current = true;
            suggestHiddenRef.current = false;
          }
          // Track Escape to clear and hide suggestions
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            clearInput();
            return;
          }

          if (e.key === "Enter") {
            const val = ref.current?.value ?? "";
            const trimmed = val.trim();
            if (!trimmed) return;

            // Plain Enter behaviour (no Cmd/Ctrl special-casing)

            // Plain Enter behaviour:
            // - If there's an exact match, open it
            // - If user navigated with arrows and suggestions are visible, let native suggest handle Enter
            // - Otherwise, create from literal input
            const exactMatch = (values || []).find(
              (v) => v.toLowerCase() === trimmed.toLowerCase()
            );
            const candidates = (values || []).filter((v) =>
              v.toLowerCase().includes(trimmed.toLowerCase())
            );

            // If suggestions were explicitly hidden (Escape), treat Enter as using the literal input
            if (suggestHiddenRef.current) {
              e.preventDefault();
              try {
                onSelect(trimmed);
              } catch (err) {
                // ignore handler errors
              } finally {
                clearInput();
              }
              return;
            }

            // If there's an exact match and user hasn't navigated, select the exact match
            if (exactMatch && !navUsedRef.current) {
              e.preventDefault();
              try {
                onSelect(exactMatch);
              } catch (err) {
                // ignore
              } finally {
                clearInput();
              }
              return;
            }

            // If user navigated with arrows and suggestions are visible, let native suggest handle Enter
            if (
              navUsedRef.current &&
              !suggestHiddenRef.current &&
              candidates.length > 0
            ) {
              return;
            }

            // Otherwise, create from literal input (no exact match or user wants literal)
            e.preventDefault();
            try {
              onSelect(trimmed);
            } catch (err) {
              // ignore
            } finally {
              clearInput();
            }
          }
        }}
      />
      {inputValue.length > 0 && (
        <button
          type="button"
          aria-label="Clear input"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border border-[var(--background-modifier-border)] bg-[var(--background-modifier-form-field)] text-[var(--text-muted)] transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)]"
          onClick={() => {
            clearInput();
          }}
        >
          <span className="text-sm leading-none">&times;</span>
        </button>
      )}
    </div>
  );
}
