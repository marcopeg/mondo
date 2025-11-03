import { useCallback, useRef, useState } from "react";
import { Notice } from "obsidian";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import Stack from "@/components/ui/Stack";
import TextField from "@/components/ui/TextField";

type QuickDailyEntryProps = {
  iconOnly?: boolean;
  onAdd?: (value: string) => Promise<void>;
};

export const QuickDailyEntry = ({
  iconOnly = false,
  onAdd,
}: QuickDailyEntryProps) => {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      focusInput();
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAdd) {
        await onAdd(trimmed);
      }
      setValue("");
    } catch (error) {
      console.error("QuickDailyEntry: failed to add daily entry", error);
      new Notice("Failed to add daily entry");
    } finally {
      setIsSubmitting(false);
      focusInput();
    }
  }, [focusInput, onAdd, value]);

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <Stack direction="row" align="center" gap={2} py={0}>
        <TextField
          ref={inputRef}
          className="setting-input flex-1 min-w-0"
          placeholder="Quick daily..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              void handleSubmit();
            }
          }}
        />
        <Button
          className={
            "mod-cta justify-center " + (iconOnly ? "w-10" : "w-12 sm:w-28")
          }
          type="submit"
          aria-label="Add daily entry"
          disabled={isSubmitting || !value.trim()}
        >
          <Icon name="send" className="w-5 h-5 mr-0" />
          {!iconOnly && <span className="hidden sm:inline">Add Daily</span>}
        </Button>
      </Stack>
    </form>
  );
};

export default QuickDailyEntry;
