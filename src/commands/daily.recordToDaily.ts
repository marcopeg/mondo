import { App, Notice } from "obsidian";
import type Mondo from "@/main";
import { setupDailyLogAndPositionCursor } from "@/commands/daily.addLog";

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

export const recordToDaily = async (app: App, plugin: Mondo) => {
  // 1. Execute the core "Append to Daily note" setup logic
  let setupResult;
  try {
    setupResult = await setupDailyLogAndPositionCursor(app, plugin);
    if (!setupResult) {
      new Notice("Failed to set up daily note.");
      return;
    }
  } catch (error) {
    console.error("Mondo: Failed to append to daily note", error);
    new Notice("Failed to append to daily note.");
    return;
  }

  const { file, editor } = setupResult;

  // 2. Start the native recording utility
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
