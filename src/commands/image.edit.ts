import { App, TAbstractFile, TFile } from "obsidian";

const SUPPORTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

const isSupportedImageFile = (file: TAbstractFile | null): file is TFile =>
  file instanceof TFile && SUPPORTED_IMAGE_EXTENSIONS.has(file.extension.toLowerCase());

const getSelectedFileFromExplorer = (app: App): TFile | null => {
  const leaves = app.workspace.getLeavesOfType("file-explorer");

  for (const leaf of leaves) {
    const view = leaf.view as unknown;

    if (
      view &&
      typeof (view as { getSelectedFile?: () => TFile | null }).getSelectedFile === "function"
    ) {
      const selected = (view as { getSelectedFile: () => TFile | null }).getSelectedFile();

      if (isSupportedImageFile(selected)) {
        return selected;
      }
    }

    const file = (view as { file?: TAbstractFile | null })?.file ?? null;

    if (isSupportedImageFile(file)) {
      return file;
    }
  }

  return null;
};

export const findActiveOrSelectedImageFile = (app: App): TFile | null => {
  const activeFile = app.workspace.getActiveFile();

  if (isSupportedImageFile(activeFile)) {
    return activeFile;
  }

  return getSelectedFileFromExplorer(app);
};
