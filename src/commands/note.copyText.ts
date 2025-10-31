import { App, Editor, MarkdownView, Notice } from "obsidian";

type CopyNoteTextOptions = {
  editor?: Editor;
  view?: MarkdownView | null;
  showSuccessNotice?: boolean;
  showFailureNotice?: boolean;
};

const copyStringToClipboard = async (value: string) => {
  if (!value) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard API unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();

  const success = document.execCommand("copy");
  textarea.remove();

  if (!success) {
    throw new Error("Copy command failed");
  }
};

const extractNoteBody = (value: string): string => {
  const frontmatterRegex = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/;
  const titleRegex = /^(?:\s*\r?\n)*#{1,6}\s+[^\r\n]*(?:\r?\n+|$)/;

  let text = value.replace(frontmatterRegex, "");

  if (titleRegex.test(text)) {
    text = text.replace(titleRegex, "");
  }

  return text.replace(/^(?:\s*\r?\n)*/, "");
};

export const copyNoteText = async (
  app: App,
  options: CopyNoteTextOptions = {}
): Promise<boolean> => {
  const showSuccessNotice = options.showSuccessNotice !== false;
  const showFailureNotice = options.showFailureNotice !== false;

  const view = options.view ?? app.workspace.getActiveViewOfType(MarkdownView);

  if (!view) {
    if (showFailureNotice) {
      new Notice("Open a note to copy its text.");
    }
    return false;
  }

  const editor = options.editor ?? view.editor;

  if (!editor) {
    if (showFailureNotice) {
      new Notice("Focus a markdown editor to copy note text.");
    }
    return false;
  }

  let text = editor.getSelection();
  const hasSelection = text.length > 0;

  if (!hasSelection) {
    const file = view.file;
    if (!file) {
      if (showFailureNotice) {
        new Notice("Unable to determine the active note to copy.");
      }
      return false;
    }

    text = await app.vault.cachedRead(file);
    text = extractNoteBody(text);
  }

  try {
    await copyStringToClipboard(text);

    if (showSuccessNotice) {
      new Notice(hasSelection ? "Selection copied." : "Note text copied.");
    }

    return true;
  } catch (error) {
    console.error("Mondo: Failed to copy note text", error);
    if (showFailureNotice) {
      new Notice("Failed to copy note text.");
    }
    return false;
  }
};
