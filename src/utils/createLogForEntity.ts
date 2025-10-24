import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import type { App, TFile } from "obsidian";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import {
  buildWikiLink,
  focusAndSelectTitle,
  slugify,
} from "@/utils/createLinkedNoteHelpers";

export type LogLinkTarget = {
  property: string;
  mode: "single" | "list";
  target: TCachedFile;
};

type CreateLogForEntityParams = {
  app: App;
  entityFile: TCachedFile;
  linkTargets: LogLinkTarget[];
  openAfterCreate?: boolean;
};

export const createLogForEntity = async ({
  app,
  entityFile,
  linkTargets,
  openAfterCreate = true,
}: CreateLogForEntityParams): Promise<TFile | null> => {
  if (!entityFile?.file) {
    console.warn("createLogForEntity: missing entity file reference");
    return null;
  }

  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createLogForEntity: CRM plugin instance not available");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const displayName = getEntityDisplayName(entityFile);
  const hostType = (entityFile.cache?.frontmatter as any)?.type as
    | string
    | undefined;

  const isEditableHost =
    hostType === CRMFileType.PERSON ||
    hostType === "person" ||
    hostType === CRMFileType.MEETING ||
    hostType === "meeting" ||
    hostType === CRMFileType.PROJECT ||
    hostType === "project" ||
    hostType === CRMFileType.TASK ||
    hostType === "task" ||
    hostType === CRMFileType.FACT ||
    hostType === "fact" ||
    hostType === CRMFileType.COMPANY ||
    hostType === "company" ||
    hostType === CRMFileType.TEAM ||
    hostType === "team" ||
    hostType === CRMFileType.LOG ||
    hostType === "log";

  const rootPathSetting = settings.rootPaths?.[CRMFileType.LOG] ?? "/";
  const normalizedFolder = normalizeFolderPath(rootPathSetting);

  if (normalizedFolder) {
    const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
    if (!existingFolder) {
      await app.vault.createFolder(normalizedFolder);
    }
  }

  const now = new Date();
  const isoTimestamp = now.toISOString();
  // Use local date/time for the human title; store the unified ISO timestamp in frontmatter
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const dateStamp = `${yyyy}-${mm}-${dd}`;
  const timeDot = `${hh}.${min}`; // hh.mm for filenames/titles

  const baseTitle = `${dateStamp} ${timeDot}`;
  const safeTitle = baseTitle;
  // If the log is created from an EntityLinks panel, include the host name to reduce duplicates
  const hostBaseName = entityFile?.file?.basename || displayName || "";
  const fromEntityPanel = Array.isArray(linkTargets) && linkTargets.length > 0;
  const rawFileBase =
    fromEntityPanel && hostBaseName
      ? `${baseTitle} on ${hostBaseName}`
      : baseTitle;
  const sanitizedFileBase = rawFileBase
    .replace(/[\\/|?*<>\"]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const fileBase = sanitizedFileBase || baseTitle;
  const slug = slugify(fileBase);
  const fileName = fileBase.endsWith(".md") ? fileBase : `${fileBase}.md`;
  const filePath = normalizedFolder
    ? `${normalizedFolder}/${fileName}`
    : fileName;

  let logFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  let didCreate = false;

  if (!logFile) {
    const templateSource = await getTemplateForType(
      app,
      settings.templates,
      CRMFileType.LOG
    );

    const rendered = renderTemplate(templateSource, {
      title: safeTitle,
      type: String(CRMFileType.LOG),
      filename: fileName,
      slug,
      date: isoTimestamp,
    });

    logFile = await app.vault.create(filePath, rendered);
    didCreate = true;
  }

  if (!logFile) {
    return null;
  }

  const validTargets = linkTargets.filter(
    (target) => target?.target?.file && target.property
  );

  await app.fileManager.processFrontMatter(logFile, (frontmatter) => {
    frontmatter.date = isoTimestamp;
    if (Object.prototype.hasOwnProperty.call(frontmatter, "time")) {
      delete (frontmatter as any).time;
    }
    if (Object.prototype.hasOwnProperty.call(frontmatter, "datetime")) {
      delete (frontmatter as any).datetime;
    }

    validTargets.forEach(({ property, mode, target }) => {
      const targetFile = target.file;
      if (!targetFile) {
        return;
      }

      const targetName = getEntityDisplayName(target);
      const wikiLink = buildWikiLink({
        app,
        sourcePath: logFile!.path,
        targetFile,
        displayName: targetName,
      });

      if (mode === "list") {
        const existing = frontmatter[property];
        if (Array.isArray(existing)) {
          const hasEntry = existing.some(
            (entry) => String(entry).trim() === wikiLink
          );
          if (!hasEntry) {
            existing.push(wikiLink);
          }
        } else if (existing === undefined || existing === null) {
          frontmatter[property] = [wikiLink];
        } else {
          const normalized = String(existing).trim();
          const entries = normalized ? [normalized] : [];
          if (!entries.includes(wikiLink)) {
            entries.push(wikiLink);
          }
          frontmatter[property] = entries;
        }
      } else {
        frontmatter[property] = wikiLink;
      }
    });

    Object.keys(frontmatter).forEach((key) => {
      if (
        key === "date" ||
        key === "type"
      ) {
        return;
      }

      const value = frontmatter[key];

      if (value === undefined || value === null) {
        delete frontmatter[key];
        return;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          delete frontmatter[key];
        } else {
          frontmatter[key] = trimmed;
        }
        return;
      }

      if (Array.isArray(value)) {
        const cleaned = value
          .map((entry) => (typeof entry === "string" ? entry.trim() : entry))
          .filter((entry) => {
            if (typeof entry === "string") {
              return entry.length > 0;
            }
            return entry !== null && entry !== undefined;
          });

        if (cleaned.length === 0) {
          delete frontmatter[key];
        } else {
          frontmatter[key] = cleaned;
        }
      }
    });
  });

  if (logFile && openAfterCreate) {
    const leaf = app.workspace.getLeaf(false);
    if (leaf && typeof (leaf as any).openFile === "function") {
      await (leaf as any).openFile(logFile);
      if (didCreate && isEditableHost) {
        window.setTimeout(() => {
          try {
            focusAndSelectTitle(leaf);
          } catch (_) {
            // ignore errors while focusing title
          }
        }, 150);
      }
    }
  }

  return logFile;
};

export default createLogForEntity;
