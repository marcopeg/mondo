import { useCallback, useRef, useState } from "react";
import { Notice } from "obsidian";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import TextField from "@/components/ui/TextField";
import Stack from "@/components/ui/Stack";
import type CRM from "@/main";
import { addDailyLog } from "@/commands/daily.addLog";

const QuickLogEntry = () => {
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

    const plugin = (app as any).plugins?.getPlugin?.("crm") as
      | CRM
      | undefined;
    if (!plugin) {
      new Notice("CRM plugin is not ready yet");
      focusInput();
      return;
    }

    setIsLogging(true);
    try {
      await addDailyLog(app, plugin, { text: trimmedQuickLog });
      setQuickLogText("");
      focusInput();
    } catch (error) {
      console.error("QuickLogEntry: failed to append daily log", error);
      new Notice("Failed to append daily log entry");
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
          placeholder="Quick log entry..."
          value={quickLogText}
          onChange={(event) => setQuickLogText(event.target.value)}
          disabled={isLogging}
        />
        <Button
          className="mod-cta w-12 sm:w-28 justify-center"
          type="submit"
          aria-label="Add log"
          disabled={isLogging || !quickLogText.trim()}
        >
          <Icon
            name="send"
            className="w-5 h-5 sm:hidden mr-0"
          />
          <span className="hidden sm:inline">Add Log</span>
        </Button>
      </Stack>
    </form>
  );
};

export default QuickLogEntry;
