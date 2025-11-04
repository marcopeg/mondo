import { WorkspaceLeaf, MarkdownView, Plugin, App } from "obsidian";
import { isJournalNote } from "@/utils/journalFocusMode";
import type Mondo from "@/main";

const CLOSE_BTN_CLASS = "mondo-journal-close-btn";

/**
 * Injects a close button in the top-right corner for journal notes in focus mode.
 * Only visible when focus mode is active and a journal note is open.
 */
export const injectJournalCloseButton = (plugin: Mondo) => {
  return () => {
    const leaf = plugin.app.workspace.activeLeaf;
    if (!leaf || !(leaf.view instanceof MarkdownView)) {
      // Remove button if not in a markdown view
      document.querySelectorAll(`.${CLOSE_BTN_CLASS}`).forEach((el) => el.remove());
      return;
    }

    const file = leaf.view.file;
    if (!isJournalNote(file, plugin)) {
      // Remove button if not a journal note
      document.querySelectorAll(`.${CLOSE_BTN_CLASS}`).forEach((el) => el.remove());
      return;
    }

    // Check if button already exists
    if (document.querySelector(`.${CLOSE_BTN_CLASS}`)) {
      return;
    }

    // Create and inject the close button
    const btn = document.createElement("button");
    btn.className = CLOSE_BTN_CLASS;
    btn.setAttribute("aria-label", "I'm done journaling for today");
    btn.setAttribute("title", "Close journal (Cmd/Ctrl+Shift+J)");
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>I'm done journaling for today</span>
    `;

    btn.addEventListener("click", () => {
      const commands = (plugin.app as any).commands;
      if (commands?.executeCommandById) {
        void commands.executeCommandById("mondo:close-journal");
      }
    });

    document.body.appendChild(btn);
  };
};

/**
 * Cleanup function to remove all injected close buttons.
 */
export const disposeJournalCloseButton = () => {
  document.querySelectorAll(`.${CLOSE_BTN_CLASS}`).forEach((el) => el.remove());
};
