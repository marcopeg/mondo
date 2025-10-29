import { TFile, type App } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "avif",
  "heic",
  "heif",
]);

type VaultCover = {
  kind: "vault";
  file: TFile;
  resourcePath: string;
};

type ExternalCover = {
  kind: "external";
  url: string;
};

export type ResolvedCoverImage = VaultCover | ExternalCover;

const extractStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const extracted = extractStringValue(entry);
      if (extracted) {
        return extracted;
      }
    }
  }

  return null;
};

const normalizeLinkTarget = (raw: string): string => {
  let value = raw.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("![[") && value.endsWith("]]")) {
    value = value.slice(3, -2);
  } else if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
  }

  const pipeIndex = value.indexOf("|");
  if (pipeIndex >= 0) {
    value = value.slice(0, pipeIndex);
  }

  const hashIndex = value.indexOf("#");
  if (hashIndex >= 0) {
    value = value.slice(0, hashIndex);
  }

  return value.trim();
};

const isImageFile = (file: TFile): boolean =>
  IMAGE_EXTENSIONS.has(file.extension.toLowerCase());

const resolveFileFromTarget = (
  app: App,
  target: string,
  sourcePath: string
): TFile | null => {
  const direct = app.vault.getAbstractFileByPath(target);
  if (direct instanceof TFile) {
    return direct;
  }

  const dest = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
  if (dest instanceof TFile) {
    return dest;
  }

  if (target.toLowerCase().endsWith(".md")) {
    const trimmed = target.replace(/\.md$/i, "");
    const fallback = app.metadataCache.getFirstLinkpathDest(trimmed, sourcePath);
    if (fallback instanceof TFile) {
      return fallback;
    }
  }

  return null;
};

export const resolveCoverImage = (
  app: App,
  entry: TCachedFile
): ResolvedCoverImage | null => {
  const frontmatter = (entry.cache?.frontmatter ?? {}) as
    | Record<string, unknown>
    | undefined;
  const raw = frontmatter?.cover;
  const coverValue = extractStringValue(raw);

  if (!coverValue) {
    return null;
  }

  if (/^(https?:|app:|data:)/i.test(coverValue)) {
    return { kind: "external", url: coverValue };
  }

  const normalized = normalizeLinkTarget(coverValue);
  if (!normalized) {
    return null;
  }

  const file = resolveFileFromTarget(app, normalized, entry.file.path);
  if (!file || !isImageFile(file)) {
    return null;
  }

  return {
    kind: "vault",
    file,
    resourcePath: app.vault.getResourcePath(file),
  };
};
