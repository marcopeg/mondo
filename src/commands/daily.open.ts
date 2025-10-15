import { App, TFile } from "obsidian";
import type CRM from "@/main";

const pad = (value: number) => String(value).padStart(2, "0");

const formatDate = (format: string, date: Date) =>
  format
    .split("YYYY")
    .join(String(date.getFullYear()))
    .split("MM")
    .join(pad(date.getMonth() + 1))
    .split("DD")
    .join(pad(date.getDate()));

export const openDailyNote = async (app: App, plugin: CRM) => {
  const settings = (plugin as any).settings || {};
  const dailySettings = settings.daily || {
    root: "Daily",
    entry: "YYYY-MM-DD",
  };

  const folderSetting = dailySettings.root || "Daily";
  const entryFormat = dailySettings.entry || "YYYY-MM-DD";

  const normalizedFolder =
    folderSetting === "/" ? "" : folderSetting.replace(/^\/+|\/+$/g, "");

  try {
    if (normalizedFolder !== "") {
      const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
      if (!existingFolder) {
        await app.vault.createFolder(normalizedFolder);
      }
    }
  } catch (error) {
    throw error;
  }

  const now = new Date();
  const fileBase = formatDate(entryFormat, now);
  const fileName = fileBase.endsWith(".md") ? fileBase : `${fileBase}.md`;
  const filePath = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

  let file = app.vault.getAbstractFileByPath(filePath) as TFile | null;

  if (!file) {
    file = await app.vault.create(filePath, "");
  }

  const markdownLeaves = app.workspace.getLeavesOfType("markdown");
  const existingLeaf = markdownLeaves.find((leaf) => {
    try {
      const openedFile = (leaf.view as any)?.file as TFile | undefined | null;
      return openedFile?.path === filePath;
    } catch (error) {
      return false;
    }
  });

  const leaf = (existingLeaf as any) ?? app.workspace.getLeaf(true);

  if (existingLeaf) {
    app.workspace.revealLeaf(existingLeaf);
  } else {
    await leaf.openFile(file as TFile);
  }
};
