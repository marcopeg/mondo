import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import { requestGeolocation } from "@/utils/geolocation";
import type { App, TFile } from "obsidian";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildWikiLink = ({
  app,
  factPath,
  targetFile,
  displayName,
}: {
  app: App;
  factPath: string;
  targetFile: TFile;
  displayName: string;
}) => {
  const linkTarget = app.metadataCache.fileToLinktext(targetFile, factPath);
  const alias = displayName ? `|${displayName}` : "";
  return `[[${linkTarget}${alias}]]`;
};

export type FactLinkTarget = {
  property: string;
  mode: "single" | "list";
  target: TCachedFile;
};

type CreateFactForEntityParams = {
  app: App;
  entityFile: TCachedFile;
  linkTargets: FactLinkTarget[];
  openAfterCreate?: boolean;
};

export const createFactForEntity = async ({
  app,
  entityFile,
  linkTargets,
  openAfterCreate = true,
}: CreateFactForEntityParams): Promise<TFile | null> => {
  if (!entityFile?.file) {
    console.warn("createFactForEntity: missing entity file reference");
    return null;
  }

  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createFactForEntity: CRM plugin instance not available");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const displayName = getEntityDisplayName(entityFile);
  const rootPathSetting = settings.rootPaths?.[CRMFileType.FACT] ?? "/";
  const normalizedFolder = normalizeFolderPath(rootPathSetting);

  if (normalizedFolder) {
    const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
    if (!existingFolder) {
      await app.vault.createFolder(normalizedFolder);
    }
  }

  const now = new Date();
  const isoTimestamp = now.toISOString();
  const dateStamp = isoTimestamp.split("T")[0];
  const timeStamp = isoTimestamp.slice(11, 16);

  const baseTitle = displayName
    ? `${dateStamp} ${timeStamp} - ${displayName}`
    : `${dateStamp} ${timeStamp} - Fact`;
  const safeTitle = baseTitle.trim() || `${dateStamp} ${timeStamp}`;
  const slug = slugify(safeTitle);
  const safeFileBase = safeTitle.replace(/[\\/|?*:<>"]/g, "-");
  const fileName = safeFileBase.endsWith(".md") ? safeFileBase : `${safeFileBase}.md`;
  const filePath = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

  let factFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;

  if (!factFile) {
    const templateSource = await getTemplateForType(
      app,
      settings.templates,
      CRMFileType.FACT
    );

    const rendered = renderTemplate(templateSource, {
      title: safeTitle,
      type: String(CRMFileType.FACT),
      filename: fileName,
      slug,
      date: dateStamp,
      time: timeStamp,
      datetime: isoTimestamp,
    });

    factFile = await app.vault.create(filePath, rendered);
  }

  if (!factFile) {
    return null;
  }

  let geoloc: unknown;
  try {
    geoloc = await requestGeolocation();
  } catch (error) {
    console.warn("createFactForEntity: failed to capture geolocation", error);
  }

  const validTargets = linkTargets.filter(
    (target) => target?.target?.file && target.property
  );

  await app.fileManager.processFrontMatter(factFile, (frontmatter) => {
    frontmatter.date = dateStamp;
    frontmatter.time = timeStamp;
    frontmatter.datetime = isoTimestamp;

    if (geoloc) {
      frontmatter.geoloc = geoloc;
    }

    validTargets.forEach(({ property, mode, target }) => {
      const targetFile = target.file;
      if (!targetFile) {
        return;
      }

      const targetName = getEntityDisplayName(target);
      const wikiLink = buildWikiLink({
        app,
        factPath: factFile!.path,
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
  });

  if (factFile && openAfterCreate) {
    const leaf = app.workspace.getLeaf(false);
    if (leaf && typeof (leaf as any).openFile === "function") {
      await (leaf as any).openFile(factFile);
    }
  }

  return factFile;
};

export default createFactForEntity;
