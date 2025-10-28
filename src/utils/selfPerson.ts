import type { App } from "obsidian";
import { TFile } from "obsidian";
import { MondoFileType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";

export type SelfPersonInfo = {
  file: TFile;
  link: string;
  displayName: string;
};

const normalizeSelfPath = (raw: string | null | undefined): string => {
  if (typeof raw !== "string") {
    return "";
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed;
};

const readSelfPathFromSettings = (app: App): string => {
  const plugin = (app as any)?.plugins?.plugins?.mondo as { settings?: Record<string, unknown> } | null;
  const settings = plugin?.settings ?? {};
  return normalizeSelfPath((settings as Record<string, unknown>).selfPersonPath as string | undefined);
};

const isPersonType = (cache: any): boolean => {
  const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
  const type = typeof frontmatter?.type === "string" ? frontmatter.type.trim().toLowerCase() : "";
  return type === MondoFileType.PERSON;
};

export const resolveSelfPerson = (
  app: App,
  fromPath: string | null | undefined,
  configuredPath?: string | null | undefined
): SelfPersonInfo | null => {
  const rawPath = normalizeSelfPath(configuredPath) || readSelfPathFromSettings(app);
  if (!rawPath) {
    return null;
  }

  let target = app.vault.getAbstractFileByPath(rawPath);
  if (!(target instanceof TFile) && !rawPath.endsWith(".md")) {
    target = app.vault.getAbstractFileByPath(`${rawPath}.md`);
  }

  if (!(target instanceof TFile)) {
    return null;
  }

  const cache = app.metadataCache.getFileCache(target) ?? undefined;
  if (cache && !isPersonType(cache)) {
    return null;
  }

  const cachedFile: TCachedFile = { file: target, cache };
  const displayName = getEntityDisplayName(cachedFile);
  const originPath = typeof fromPath === "string" && fromPath ? fromPath : target.path;
  const linkTarget = app.metadataCache.fileToLinktext(target, originPath);
  const alias = displayName && displayName !== linkTarget ? displayName : "";
  const link = alias ? `[[${linkTarget}|${alias}]]` : `[[${linkTarget}]]`;

  return { file: target, link, displayName };
};
