import { App, MarkdownView, Notice } from "obsidian";
import type Mondo from "@/main";
import { openDailyNote } from "@/commands/daily.open";
import { insertTimestamp } from "@/commands/timestamp.insert";

export const quickDictation = async (app: App, plugin: Mondo) => {
  // 1. Open or create the daily note
  await openDailyNote(app, plugin);

  // Wait a tick to ensure the note is fully opened
  await new Promise((resolve) => setTimeout(resolve, 100));

  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.editor) {
    new Notice("Unable to access the active note.");
    return;
  }

  const editor = view.editor;
  const content = editor.getValue();

  // 2. Move to the end of the file
  // 3. Ensure there is exactly one full empty line before the timestamp
  const lastLine = editor.lastLine();
  const lastLineContent = editor.getLine(lastLine);

  if (content.trim() === "") {
    // Empty note, just position at start
    editor.setCursor({ line: 0, ch: 0 });
  } else if (lastLineContent.trim() !== "") {
    // Last line has content, add two newlines to create one empty line
    editor.setCursor({ line: lastLine, ch: lastLineContent.length });
    editor.replaceRange("\n\n", { line: lastLine, ch: lastLineContent.length });
    const newLastLine = editor.lastLine();
    editor.setCursor({ line: newLastLine, ch: 0 });
  } else {
    // Last line is empty - check the line before it
    if (lastLine > 0) {
      const prevLineContent = editor.getLine(lastLine - 1);
      if (prevLineContent.trim() !== "") {
        // Previous line has content and current line is empty = we have our blank line
        editor.setCursor({ line: lastLine, ch: 0 });
      } else {
        // Multiple empty lines - position at the last one
        editor.setCursor({ line: lastLine, ch: 0 });
      }
    } else {
      // Only one empty line at start
      editor.setCursor({ line: 0, ch: 0 });
    }
  }

  // 4. Insert the timestamp
  insertTimestamp(app, plugin, { showFailureNotice: false });

  // 5. Start the dictation functionality
  const noteDictationManager = (plugin as any).noteDictationManager;
  if (!noteDictationManager) {
    new Notice("Dictation is not available.");
    return;
  }

  const status = noteDictationManager.getDictationStatus();
  if (status === "recording") {
    new Notice("Dictation already in progress.");
    return;
  }

  const result = await noteDictationManager.startDictation();
  if (result === "started") {
    new Notice("Dictation started. Tap again to stop.");
  } else if (result === "recording") {
    new Notice("Dictation already in progress.");
  }
};


