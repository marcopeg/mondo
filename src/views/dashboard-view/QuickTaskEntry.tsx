import { useCallback, useRef, useState } from "react";
import { Notice } from "obsidian";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import TextField from "@/components/ui/TextField";
import Stack from "@/components/ui/Stack";
import type Mondo from "@/main";
import { addDailyLog } from "@/commands/daily.addLog";

type QuickTaskProps = {
  iconOnly?: boolean;
};

const QuickTask = ({ iconOnly = false }: QuickTaskProps) => {
  const app = useApp();
  const [quickLogText, setQuickLogText] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const handleQuickLog = useCallback(async () => {
    const trimmedQuickLog = quickLogText.trim();

    if (!trimmedQuickLog) {
      focusInput();
      return;
    }

    const plugin = (app as any).plugins?.getPlugin?.("mondo") as Mondo | undefined;
    if (!plugin) {
      new Notice("Mondo plugin is not ready yet");
      focusInput();
      return;
    }

    setIsLogging(true);
    try {
      await addDailyLog(app, plugin, { text: trimmedQuickLog, mode: "task" });
      setQuickLogText("");
      focusInput();
    } catch (error) {
      console.error("QuickTask: failed to append daily task", error);
      new Notice("Failed to append daily task entry");
      focusInput();
    } finally {
      setIsLogging(false);
    }
  }, [app, quickLogText, focusInput]);

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        void handleQuickLog();
      }}
    >
      <Stack direction="row" align="center" gap={2} py={0}>
        <TextField
          ref={inputRef}
          className="setting-input flex-1 min-w-0"
          placeholder="Quick task..."
          value={quickLogText}
          onChange={(event) => setQuickLogText(event.target.value)}
          disabled={isLogging}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              void handleQuickLog();
            }
          }}
        />
        <Button
          className={
            "mod-cta justify-center " + (iconOnly ? "w-10" : "w-12 sm:w-28")
          }
          type="submit"
          aria-label="Add task"
          disabled={isLogging || !quickLogText.trim()}
        >
          <Icon name="send" className="w-5 h-5 mr-0" />
          {!iconOnly && <span className="hidden sm:inline">Add Task</span>}
        </Button>
      </Stack>
    </form>
  );
};

export default QuickTask;
