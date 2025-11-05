import type { App, TFile } from "obsidian";
import {
  getMondoEntityConfig,
  isDailyNoteType,
  isJournalType,
  isMondoEntityType,
} from "@/types/MondoFileType";
import type { MondoFileType } from "@/types/MondoFileType";

export type DailyNoteReference = {
  path: string;
  label: string;
  icon: string;
  type: MondoFileType | null;
  count: number;
  timestamp?: number;
};

const DEFAULT_ICON = "file-text";

const normalizeLinkValues = (raw: unknown): Array<{ value: string; timestamp?: number }> => {
  if (Array.isArray(raw)) {
    const entries: Array<{ value: string; timestamp?: number }> = [];
    raw.forEach((item) => {
      // New format: { link: "[[Note]]", timestamp: 123456789 }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        const link = obj.link ?? obj.raw ?? obj.value;
        if (typeof link === "string" && link.trim().length > 0) {
          const timestamp = typeof obj.timestamp === "number" ? obj.timestamp : undefined;
          entries.push({ value: link.trim(), timestamp });
        }
      }
      // Legacy format: string values
      else if (typeof item === "string" && item.trim().length > 0) {
        entries.push({ value: item.trim() });
      }
    });
    return entries;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return [{ value: trimmed }];
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
): {
  type: MondoFileType | null;
  icon: string;
  shouldExclude: boolean;
} => {
  const cache = app.metadataCache.getFileCache(file);
  const rawType =
    cache?.frontmatter?.mondoType ?? cache?.frontmatter?.type;
  if (typeof rawType === "string") {
    const normalized = rawType.trim().toLowerCase();
    if (isMondoEntityType(normalized)) {
      const config = getMondoEntityConfig(normalized);
      return {
        type: normalized,
        icon: config?.icon ?? DEFAULT_ICON,
        shouldExclude: false,
      };
    }

    if (isDailyNoteType(normalized) || isJournalType(normalized)) {
      return {
        type: null,
        icon: DEFAULT_ICON,
        shouldExclude: true,
      };
    }
  }

  return { type: null, icon: DEFAULT_ICON, shouldExclude: false };
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

  values.forEach(({ value, timestamp }) => {
    const { file, alias } = resolveLinkTarget(value, app, sourcePath);
    if (!file) {
      return;
    }
    if (excludedPaths.has(file.path) || seen.has(file.path)) {
      return;
    }
    seen.add(file.path);

    const { type, icon, shouldExclude } = resolveFileType(file, app);
    if (shouldExclude) {
      return;
    }
    const label = getDisplayLabel(file, alias, app, sourcePath);

    entries.push({
      path: file.path,
      label,
      icon,
      type,
      count: 1,
      timestamp,
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
    let timestamp: number | undefined = undefined;

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
      // Extract timestamp if present
      if (typeof objectValue.timestamp === "number") {
        timestamp = objectValue.timestamp;
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

    const { type, icon, shouldExclude } = resolveFileType(file, app);
    if (shouldExclude) {
      return;
    }
    const label = getDisplayLabel(file, alias, app, sourcePath);

    entries.push({
      path: file.path,
      label,
      icon,
      type,
      count: 1,
      timestamp,
    });
  });

  return entries;
};
