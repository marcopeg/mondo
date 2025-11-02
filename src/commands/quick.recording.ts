import { App, Notice } from "obsidian";
import type Mondo from "@/main";
import { quickLog } from "@/commands/quick.log";

export const quickRecording = async (app: App, plugin: Mondo) => {
  // Execute all steps from quickLog
  await quickLog(app, plugin);

  // Start recording automatically
  const noteDictationManager = (plugin as any).noteDictationManager;
  if (!noteDictationManager) {
    new Notice("Recording is not available.");
    return;
  }

  const status = noteDictationManager.getDictationStatus();
  if (status === "recording") {
    new Notice("Recording already in progress.");
    return;
  }

  const result = await noteDictationManager.startDictation();
  if (result === "started") {
    new Notice("Recording started. Tap again to stop.");
  } else if (result === "recording") {
    new Notice("Recording already in progress.");
  }
};
