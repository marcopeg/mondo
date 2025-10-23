import type { App, TFile } from "obsidian";
import { getCRMEntityConfig, isCRMEntityType } from "@/types/CRMFileType";
import type { CRMFileType } from "@/types/CRMFileType";

export type DailyNoteReference = {
  path: string;
  label: string;
  icon: string;
  type: CRMFileType | null;
  count: number;
};

const DEFAULT_ICON = "file-text";

const normalizeLinkValues = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return [trimmed];
    }
  }

  return [];
};

const resolveLinkTarget = (
  value: string,
  app: App,
  sourcePath: string
): { file: TFile | null; alias: string | null } => {
  let inner = value.trim();
  if (!inner) {
    return { file: null, alias: null };
  }

  if (inner.startsWith("[[") && inner.endsWith("]]")) {
    inner = inner.slice(2, -2);
  }

  const [target, alias] = inner.split("|");
  const cleanedTarget = target.split("#")[0]?.trim() ?? "";
  if (!cleanedTarget) {
    return { file: null, alias: null };
  }

  const file = app.metadataCache.getFirstLinkpathDest(
    cleanedTarget,
    sourcePath
  );
  if (!file) {
    return { file: null, alias: null };
  }

  return { file, alias: alias ? alias.trim() : null };
};

const resolveFileType = (
  file: TFile,
  app: App
): { type: CRMFileType | null; icon: string } => {
  const cache = app.metadataCache.getFileCache(file);
  const rawType = cache?.frontmatter?.type;
  if (typeof rawType === "string") {
    const normalized = rawType.trim().toLowerCase();
    if (isCRMEntityType(normalized)) {
      const config = getCRMEntityConfig(normalized);
      return {
        type: normalized,
        icon: config?.icon ?? DEFAULT_ICON,
      };
    }
  }

  return { type: null, icon: DEFAULT_ICON };
};

const getDisplayLabel = (
  file: TFile,
  alias: string | null,
  app: App,
  sourcePath: string
): string => {
  if (alias && alias.length > 0) {
    return alias;
  }
  const linktext = app.metadataCache.fileToLinktext(file, sourcePath, false);
  if (linktext && linktext.length > 0) {
    return linktext;
  }
  return file.basename ?? file.name;
};

export const extractDailyLinkReferences = (
  raw: unknown,
  app: App,
  sourcePath: string,
  excludedPaths: Set<string>
): DailyNoteReference[] => {
  const values = normalizeLinkValues(raw);
  if (!values.length) {
    return [];
  }

  const seen = new Set<string>();
  const entries: DailyNoteReference[] = [];

  values.forEach((value) => {
    const { file, alias } = resolveLinkTarget(value, app, sourcePath);
    if (!file) {
      return;
    }
    if (excludedPaths.has(file.path) || seen.has(file.path)) {
      return;
    }
    seen.add(file.path);

    const { type, icon } = resolveFileType(file, app);
    const label = getDisplayLabel(file, alias, app, sourcePath);

    entries.push({
      path: file.path,
      label,
      icon,
      type,
      count: 1,
    });
  });

  return entries;
};

export const extractDailyOpenedReferences = (
  raw: unknown,
  app: App,
  sourcePath: string,
  excludedPaths: Set<string>
): DailyNoteReference[] => {
  if (!raw) {
    return [];
  }

  const values = Array.isArray(raw) ? raw : [raw];
  const entries: DailyNoteReference[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    let link: string | null = null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        link = trimmed;
      }
    } else if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      const maybeLink =
        objectValue.link ?? objectValue.raw ?? objectValue.value;
      if (typeof maybeLink === "string") {
        const trimmed = maybeLink.trim();
        if (trimmed.length > 0) {
          link = trimmed;
        }
      }
    }

    if (!link) {
      return;
    }

    const { file, alias } = resolveLinkTarget(link, app, sourcePath);
    if (!file) {
      return;
    }
    if (excludedPaths.has(file.path) || seen.has(file.path)) {
      return;
    }

    seen.add(file.path);

    const { type, icon } = resolveFileType(file, app);
    const label = getDisplayLabel(file, alias, app, sourcePath);

    entries.push({
      path: file.path,
      label,
      icon,
      type,
      count: 1,
    });
  });

  return entries;
};
