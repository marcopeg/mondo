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

export type DocumentLinkTarget = {
  property: string;
  mode: "single" | "list";
  target: TCachedFile;
};

type CreateDocumentForEntityParams = {
  app: App;
  entityFile: TCachedFile;
  linkTargets: DocumentLinkTarget[];
  openAfterCreate?: boolean;
};

const sanitizeFileBase = (value: string): string =>
  value
    .replace(/[\\/:|?*<>\"]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const ensureFolder = async (app: App, folderPath: string) => {
  if (!folderPath) {
    return;
  }
  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (!existing) {
    await app.vault.createFolder(folderPath);
  }
};

const ensureUniqueFilePath = (
  app: App,
  folder: string,
  baseName: string
): { filePath: string; fileName: string } => {
  const sanitizedBase = sanitizeFileBase(baseName) || "Untitled Document";

  let attempt = 0;
  while (attempt < 1000) {
    const suffix = attempt === 0 ? "" : ` ${attempt + 1}`;
    const candidateName = `${sanitizedBase}${suffix}`.trim();
    const fileName = candidateName.endsWith(".md")
      ? candidateName
      : `${candidateName}.md`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    if (!app.vault.getAbstractFileByPath(filePath)) {
      return { filePath, fileName };
    }

    attempt += 1;
  }

  const fallbackName = `${sanitizedBase}-${Date.now()}.md`;
  const fallbackPath = folder ? `${folder}/${fallbackName}` : fallbackName;
  return { filePath: fallbackPath, fileName: fallbackName };
};

export const createDocumentForEntity = async ({
  app,
  entityFile,
  linkTargets,
  openAfterCreate = true,
}: CreateDocumentForEntityParams): Promise<TFile | null> => {
  if (!entityFile?.file) {
    console.warn("createDocumentForEntity: missing entity file reference");
    return null;
  }

  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createDocumentForEntity: CRM plugin instance not available");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const rootPathSetting = settings.rootPaths?.[CRMFileType.DOCUMENT] ?? "/";
  const normalizedFolder = normalizeFolderPath(rootPathSetting);
  await ensureFolder(app, normalizedFolder);

  const baseTitle = "Untitled Document";
  const { filePath, fileName } = ensureUniqueFilePath(
    app,
    normalizedFolder,
    baseTitle
  );

  const existingFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  if (existingFile) {
    // The ensureUniqueFilePath helper should avoid collisions, but bail out if found.
    console.warn(
      `createDocumentForEntity: a file already exists at "${filePath}"`
    );
    return existingFile;
  }

  const templateSource = await getTemplateForType(
    app,
    settings.templates,
    CRMFileType.DOCUMENT
  );

  const now = new Date();
  const isoTimestamp = now.toISOString();
  const dateStamp = isoTimestamp.slice(0, 10);
  const timeStamp = isoTimestamp.slice(11, 16);
  const slug = slugify(baseTitle);

  const rendered = renderTemplate(templateSource, {
    title: baseTitle,
    type: String(CRMFileType.DOCUMENT),
    filename: fileName,
    slug,
    date: dateStamp,
    datetime: isoTimestamp,
    time: timeStamp,
  });

  const documentFile = await app.vault.create(filePath, rendered);
  const validTargets = linkTargets.filter(
    (target) =>
      typeof target?.property === "string" &&
      target.property.trim().length > 0 &&
      target.target?.file
  );

  if (validTargets.length > 0) {
    await app.fileManager.processFrontMatter(documentFile, (frontmatter) => {
      validTargets.forEach(({ property, mode, target }) => {
        const propertyKey = property.trim();
        const targetFile = target.file;
        if (!propertyKey || !targetFile) {
          return;
        }

        const targetName = getEntityDisplayName(target);
        const wikiLink = buildWikiLink({
          app,
          sourcePath: documentFile.path,
          targetFile,
          displayName: targetName,
        });

        if (mode === "list") {
          const existing = frontmatter[propertyKey];
          if (Array.isArray(existing)) {
            const hasEntry = existing.some(
              (entry) => String(entry).trim() === wikiLink
            );
            if (!hasEntry) {
              existing.push(wikiLink);
            }
          } else if (existing === undefined || existing === null) {
            frontmatter[propertyKey] = [wikiLink];
          } else {
            const normalized = String(existing).trim();
            const entries = normalized ? [normalized] : [];
            if (!entries.includes(wikiLink)) {
              entries.push(wikiLink);
            }
            frontmatter[propertyKey] = entries;
          }
        } else {
          frontmatter[propertyKey] = wikiLink;
        }
      });
    });
  }

  if (openAfterCreate) {
    const leaf = app.workspace.getLeaf(false);
    if (leaf && typeof (leaf as any).openFile === "function") {
      await (leaf as any).openFile(documentFile);
      window.setTimeout(() => {
        try {
          focusAndSelectTitle(leaf);
        } catch (_) {
          // ignore focus issues
        }
      }, 150);
    }
  }

  return documentFile;
};

export default createDocumentForEntity;
