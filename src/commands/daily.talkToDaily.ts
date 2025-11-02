import { App, Notice } from "obsidian";
import type Mondo from "@/main";
import { addDailyLog } from "@/commands/daily.addLog";

export const talkToDaily = async (app: App, plugin: Mondo) => {
  // 1. Execute "Append to Daily note" command
  try {
    await addDailyLog(app, plugin);
  } catch (error) {
    console.error("Mondo: Failed to append to daily note", error);
    new Notice("Failed to append to daily note.");
    return;
  }

  // Wait a tick to ensure the daily note is fully set up
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 2. Start the dictation functionality
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
