import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  type EditorSelection,
} from "obsidian";
import type Mondo from "@/main";
import { addDailyLog } from "@/commands/daily.addLog";
import { cleanClipboardText } from "@/utils/cleanClipboardText";

type MagicPasteContext = {
  editor?: Editor | null;
  view?: MarkdownView | null;
};

type MagicPasteModalOptions = {
  app: App;
  initialText: string;
  onInsert: (value: string) => Promise<void> | void;
};

const readClipboardText = async (): Promise<string> => {
  if (typeof navigator === "undefined") {
    return "";
  }

  try {
    if (navigator.clipboard?.readText) {
      const value = await navigator.clipboard.readText();
      return typeof value === "string" ? value : "";
    }
  } catch (error) {
    console.error("Mondo: Failed to read clipboard", error);
  }

  return "";
};

const hasExplicitCursor = (editor: Editor): boolean => {
  try {
    const selections = editor.listSelections?.() as EditorSelection[] | undefined;
    return !!selections && selections.length > 0;
  } catch (error) {
    return false;
  }
};

const appendToBottom = (editor: Editor, value: string) => {
  const documentText = editor.getValue();
  const needsLeadingNewline = documentText.length > 0 && !documentText.endsWith("\n");
  const insertText = `${needsLeadingNewline ? "\n" : ""}${value}`;
  const lastLine = editor.lastLine();
  const lastLineLength = lastLine >= 0 ? editor.getLine(lastLine).length : 0;
  const insertPosition = needsLeadingNewline
    ? { line: lastLine, ch: lastLineLength }
    : { line: editor.lineCount(), ch: 0 };

  editor.replaceRange(insertText, insertPosition);
  const endLine = editor.lastLine();
  const endCh = editor.getLine(endLine).length;
  editor.setCursor({ line: endLine, ch: endCh });
  editor.focus();
};

const insertIntoEditor = (
  editor: Editor,
  value: string,
  savedCursor?: { line: number; ch: number } | null
) => {
  if (!value) {
    return false;
  }

  const editorHasCursor = hasExplicitCursor(editor) && editor.hasFocus();

  if (editorHasCursor) {
    const selection = editor.getSelection();
    if (selection && selection.length > 0) {
      editor.replaceSelection(value);
    } else {
      const cursor = editor.getCursor();
      editor.replaceRange(value, cursor);
    }
    editor.focus();
    return true;
  }

  // If we have a saved cursor position, insert at that position
  if (savedCursor) {
    editor.replaceRange(value, savedCursor);
    // Move cursor to end of inserted text
    const lines = value.split("\n");
    const lastLineIndex = savedCursor.line + lines.length - 1;
    const lastLineLength = lines[lines.length - 1].length;
    const newCursorPos =
      lines.length === 1
        ? { line: savedCursor.line, ch: savedCursor.ch + lastLineLength }
        : { line: lastLineIndex, ch: lastLineLength };
    editor.setCursor(newCursorPos);
    editor.focus();
    return true;
  }

  appendToBottom(editor, value);
  return true;
};

class MagicPasteModal extends Modal {
  private readonly initialText: string;
  private readonly onInsert: (value: string) => Promise<void> | void;
  private textareaEl: HTMLTextAreaElement | null = null;
  private insertButtonEl: HTMLButtonElement | null = null;
  private isProcessing = false;

  constructor(options: MagicPasteModalOptions) {
    super(options.app);
    this.initialText = options.initialText;
    this.onInsert = options.onInsert;
  }

  onOpen() {
    this.titleEl.setText("Magic Paste");
    this.modalEl.addClass("mondo-magic-paste-modal");

    const container = this.contentEl.createDiv({ cls: "mondo-magic-paste" });
    container.createEl("p", {
      cls: "mondo-magic-paste__description",
      text: "Review and insert cleaned clipboard text.",
    });

    const textarea = container.createEl("textarea", {
      cls: "mondo-magic-paste__textarea",
      attr: {
        rows: "14",
        placeholder: "Paste text here…",
      },
    });
    this.textareaEl = textarea;
    textarea.value = this.initialText;

    textarea.addEventListener("paste", this.handlePaste);
    textarea.addEventListener("keydown", this.handleKeyDown);

    const actions = container.createDiv({ cls: "mondo-magic-paste__actions" });

    const cancelButton = actions.createEl("button", {
      cls: "mondo-magic-paste__button", // use default styles
      text: "Cancel",
      type: "button",
    });
    cancelButton.addEventListener("click", this.handleCancel);

    const insertButton = actions.createEl("button", {
      cls: "mondo-magic-paste__button mondo-magic-paste__button--primary", // custom class for CTA
      text: "Insert",
      type: "button",
    });
    insertButton.addEventListener("click", this.handleInsert);
    this.insertButtonEl = insertButton;

    window.setTimeout(() => {
      const hasText = this.textareaEl && this.textareaEl.value.trim().length > 0;
      if (hasText) {
        // If there's initial text, focus the Insert button so Enter activates it immediately.
        this.insertButtonEl?.focus();
      } else if (this.textareaEl) {
        this.textareaEl.focus();
        this.textareaEl.setSelectionRange(this.textareaEl.value.length, this.textareaEl.value.length);
      }
    }, 0);
  }

  onClose() {
    this.textareaEl?.removeEventListener("paste", this.handlePaste);
    this.textareaEl?.removeEventListener("keydown", this.handleKeyDown);
    this.contentEl.empty();
  }

  private handlePaste = (event: ClipboardEvent) => {
    if (!this.textareaEl) {
      return;
    }

    const clipboardData = event.clipboardData?.getData("text") ?? "";
    if (!clipboardData) {
      return;
    }

    event.preventDefault();
    const cleaned = cleanClipboardText(clipboardData);
    const { selectionStart, selectionEnd, value } = this.textareaEl;
    const before = value.slice(0, selectionStart ?? value.length);
    const after = value.slice(selectionEnd ?? value.length);
    const nextValue = `${before}${cleaned}${after}`;
    this.textareaEl.value = nextValue;

    const cursorPosition = before.length + cleaned.length;
    this.textareaEl.setSelectionRange(cursorPosition, cursorPosition);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void this.handleInsert();
    }
  };

  private handleCancel = () => {
    if (this.isProcessing) {
      return;
    }

    this.close();
  };

  private handleInsert = async () => {
    if (this.isProcessing || !this.textareaEl) {
      return;
    }

    const cleaned = cleanClipboardText(this.textareaEl.value);
    if (!cleaned) {
      new Notice("Provide text to insert.");
      return;
    }

    this.isProcessing = true;
    this.insertButtonEl?.setAttr("disabled", "true");

    try {
      await this.onInsert(cleaned);
      this.close();
    } catch (error) {
      console.error("Mondo: Failed to insert cleaned text", error);
      new Notice("Failed to insert cleaned text.");
      this.insertButtonEl?.removeAttribute("disabled");
      this.isProcessing = false;
    }
  };
}

const resolveEditor = (
  app: App,
  context: MagicPasteContext
): { editor: Editor | null; view: MarkdownView | null } => {
  const providedEditor = context.editor ?? null;
  const providedView = context.view ?? null;
  if (providedEditor && providedView) {
    return { editor: providedEditor, view: providedView };
  }

  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  return {
    editor: providedEditor ?? activeView?.editor ?? null,
    view: providedView ?? activeView ?? null,
  };
};

export const openMagicPaste = async (
  app: App,
  plugin: Mondo,
  context: MagicPasteContext = {}
) => {
  const { editor, view } = resolveEditor(app, context);

  // Capture the cursor position before opening the modal
  const savedCursor = editor ? editor.getCursor() : null;

  let clipboardText = "";
  try {
    clipboardText = await readClipboardText();
  } catch (error) {
    console.error("Mondo: Clipboard read failed", error);
  }

  const initialText = clipboardText ? cleanClipboardText(clipboardText) : "";

  const handleInsert = async (value: string) => {
    const latestView = app.workspace.getActiveViewOfType(MarkdownView) ?? view;
    const latestEditor = latestView?.editor ?? editor;

    if (latestEditor) {
      insertIntoEditor(latestEditor, value, savedCursor);
      new Notice("Cleaned text inserted.");
      return;
    }

    await addDailyLog(app, plugin, { text: value });
    new Notice("Appended cleaned text to daily log.");
  };

  const modal = new MagicPasteModal({
    app,
    initialText,
    onInsert: handleInsert,
  });

  modal.open();
};
