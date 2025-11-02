import { App, MarkdownView, Notice } from "obsidian";
import type Mondo from "@/main";
import { openDailyNote } from "@/commands/daily.open";
import { insertTimestamp } from "@/commands/timestamp.insert";

const DEFAULT_AUDIO_TYPE = "audio/webm";

const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}.${minutes}.${seconds}`;
};

export const quickRecording = async (app: App, plugin: Mondo) => {
  // 1. Open or create the daily note
  await openDailyNote(app, plugin);

  // Wait a tick to ensure the note is fully opened
  await new Promise((resolve) => setTimeout(resolve, 100));

  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.editor || !view.file) {
    new Notice("Unable to access the active note.");
    return;
  }

  const editor = view.editor;
  const file = view.file;
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

  // 5. Start the obsidian native recording utility on the cursor position
  if (!navigator?.mediaDevices?.getUserMedia) {
    new Notice("Microphone access is not supported in this environment.");
    return;
  }

  const cursor = editor.getCursor();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : DEFAULT_AUDIO_TYPE;
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.addEventListener("dataavailable", (event) => {
      chunks.push(event.data);
    });

    recorder.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());

      const blob = new Blob(chunks, { type: mimeType });
      const audioFolder = "audio";

      try {
        // Ensure audio folder exists
        try {
          const existingFolder = app.vault.getAbstractFileByPath(audioFolder);
          if (!existingFolder) {
            await app.vault.createFolder(audioFolder);
          }
        } catch (e) {
          // Folder might already exist
        }

        // Save audio file
        const timestamp = getTimestamp();
        const fileName = `Recording ${timestamp}.webm`;
        const audioPath = `${audioFolder}/${fileName}`;
        const audioFile = await app.vault.createBinary(audioPath, await blob.arrayBuffer());

        // Create link to audio file
        const linkText = app.metadataCache
          .fileToLinktext(audioFile, file.path)
          .trim();

        // Insert embed link at the saved cursor position
        editor.replaceRange(`![[${linkText}]]\n`, cursor);

        new Notice("Recording saved and embedded.");
      } catch (error) {
        console.error("Mondo: Failed to save recording", error);
        new Notice("Failed to save recording.");
      }
    });

    recorder.start();
    new Notice("Recording started. Click anywhere in Obsidian to stop recording.");

    // Create a way to stop recording
    const stopRecording = () => {
      recorder.stop();
      document.removeEventListener("click", stopRecording);
    };

    document.addEventListener("click", stopRecording);

    // Auto-stop after 5 minutes (300000ms)
    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
        document.removeEventListener("click", stopRecording);
      }
    }, 300000);
  } catch (error) {
    console.error("Mondo: Failed to start recording", error);
    const message = error instanceof Error ? error.message : "Unable to access microphone";
    new Notice(`Recording failed: ${message}`);
  }
};

