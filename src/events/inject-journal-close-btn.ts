import { MarkdownView } from "obsidian";
import { isJournalNote } from "@/utils/journalFocusMode";
import { isFocusModeActive } from "@/utils/focusMode";
import type Mondo from "@/main";

const CLOSE_BTN_CLASS = "mondo-journal-close-btn"; // also used for generic focus exit

/**
 * Injects a close button in the top-right corner for journal notes in focus mode.
 * Only visible when focus mode is active and a journal note is open.
 */
export const injectJournalCloseButton = (plugin: Mondo) => {
  return () => {
    const leaf = plugin.app.workspace.activeLeaf;
    const isMarkdown = !!(leaf && leaf.view instanceof MarkdownView);
    const focusActive = isFocusModeActive();

    // Always clear any existing button first
    document
      .querySelectorAll(`.${CLOSE_BTN_CLASS}`)
      .forEach((el) => el.remove());

    if (!focusActive || !isMarkdown) {
      // Only show button in focus mode inside markdown views
      return;
    }

    const file = (leaf!.view as MarkdownView).file;
    const isJournal = isJournalNote(file ?? null, plugin);

    // Create and inject the focus/journal exit button
  const btn = document.createElement("button");
  // Keep our own minimalist class; we'll place it inside the status bar so it aligns,
  // but avoid inheriting pill/badge styles from theme status items.
  btn.className = CLOSE_BTN_CLASS;
    const label = isJournal
      ? "I'm done journaling for today"
      : "Exit Focus Mode";
    btn.setAttribute(
      "aria-label",
      isJournal ? "I'm done journaling for today" : "Exit Focus Mode"
    );
    btn.setAttribute(
      "title",
      isJournal
        ? "Close journal (Cmd/Ctrl+Shift+J)"
        : "Exit focus mode (use the command again to toggle)"
    );
    // Text-only label to match status items
    btn.textContent = label;

    btn.addEventListener("click", () => {
      const commands = (plugin.app as any).commands;
      if (commands?.executeCommandById) {
        const id = isJournal
          ? "mondo:toggle-journaling"
          : "mondo:focus-mode-toggle";
        void commands.executeCommandById(id);
      }
    });

    // Inject into body with fixed positioning so it can align to the left edge
    // of the viewport independent of the status bar.
    document.body.appendChild(btn);
  };
};

/**
 * Cleanup function to remove all injected close buttons.
 */
export const disposeJournalCloseButton = () => {
  document.querySelectorAll(`.${CLOSE_BTN_CLASS}`).forEach((el) => el.remove());
};
