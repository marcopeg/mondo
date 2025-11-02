import { App, MarkdownView } from "obsidian";
import type Mondo from "@/main";
import { openDailyNote } from "@/commands/daily.open";
import { insertTimestamp } from "@/commands/timestamp.insert";

export const quickLog = async (app: App, plugin: Mondo) => {
  // Open or create the daily note
  await openDailyNote(app, plugin);

  // Wait a tick to ensure the note is fully opened
  await new Promise((resolve) => setTimeout(resolve, 100));

  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.editor) {
    return;
  }

  const editor = view.editor;
  const content = editor.getValue();

  // Determine where to insert the timestamp with a blank line before it
  const lastLine = editor.lastLine();
  const lastLineContent = editor.getLine(lastLine);

  if (content.trim() === "") {
    // Empty note - just insert timestamp at start
    editor.setCursor({ line: 0, ch: 0 });
  } else if (lastLineContent.trim() !== "") {
    // Last line has content - add newlines to create blank line, then position cursor
    editor.setCursor({ line: lastLine, ch: lastLineContent.length });
    // Insert two newlines: one to end current line, one to create the blank line
    editor.replaceRange("\n\n", { line: lastLine, ch: lastLineContent.length });
    // Move cursor to the blank line (which is now the new last line)
    const newLastLine = editor.lastLine();
    editor.setCursor({ line: newLastLine, ch: 0 });
  } else {
    // Last line is empty - check the line before it
    if (lastLine > 0) {
      const prevLineContent = editor.getLine(lastLine - 1);
      if (prevLineContent.trim() !== "") {
        // Previous line has content and current line is empty = we have our blank line
        // Position cursor on the empty line
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

  // Insert the timestamp
  insertTimestamp(app, plugin, { showFailureNotice: false });

  // Focus the cursor
  editor.focus();
};
