import { App, MarkdownView, TFile } from "obsidian";
import { normalizePath } from "obsidian";
import { activateFocusMode, deactivateFocusMode } from "./focusMode";
import type Mondo from "@/main";

/**
 * Detects if a file is a journal entry based on the journal settings.
 * Compares the file's folder path with the configured journal root.
 */
export const isJournalNote = (file: TFile | null, plugin: Mondo): boolean => {
  if (!file) return false;

  const journalSettings = (plugin.settings?.journal as any) || {};
  const journalRoot = journalSettings.root || "Journal";
  const normalizedJournalRoot = normalizePath(journalRoot);

  const filePath = normalizePath(file.path);
  const fileFolder = normalizePath(file.parent?.path ?? "");

  // Check if the file is directly in the journal root or in a subfolder of it
  return (
    fileFolder === normalizedJournalRoot ||
    fileFolder.startsWith(normalizedJournalRoot + "/")
  );
};

/**
 * Manages automatic focus-mode toggling for journal notes.
 * Activates focus mode when a journal note is focused, deactivates when switching away.
 */
export const createJournalFocusModeHandler = (plugin: Mondo) => {
  return () => {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const activeFile = activeView?.file ?? null;

    if (isJournalNote(activeFile, plugin)) {
      activateFocusMode(plugin.app, "journal");
    } else {
      deactivateFocusMode(plugin.app, "journal");
    }
  };
};
