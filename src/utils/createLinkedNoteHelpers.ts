import type { App, TFile } from "obsidian";

export const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;

  const inlineTitleEl: HTMLElement | null =
    view?.contentEl?.querySelector?.(".inline-title") ??
    view?.containerEl?.querySelector?.(".inline-title") ??
    null;
  if (inlineTitleEl) {
    inlineTitleEl.focus();
    try {
      const selection = (window as any)?.getSelection?.();
      const range = (document as any).createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(inlineTitleEl);
        selection.addRange(range);
      }
    } catch (_) {
      // ignore selection errors
    }
    return true;
  }

  const titleInput: HTMLInputElement | undefined =
    view?.fileView?.inputEl ?? view?.titleEl?.querySelector?.("input");
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
    return true;
  }

  const executed = (
    view?.app ?? (window as any)?.app
  )?.commands?.executeCommandById?.("app:rename-file");
  return Boolean(executed);
};

export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const buildWikiLink = ({
  app,
  sourcePath,
  targetFile,
  displayName,
}: {
  app: App;
  sourcePath: string;
  targetFile: TFile;
  displayName: string;
}) => {
  const linkTarget = app.metadataCache.fileToLinktext(targetFile, sourcePath);
  const alias = displayName ? `|${displayName}` : "";
  return `[[${linkTarget}${alias}]]`;
};
