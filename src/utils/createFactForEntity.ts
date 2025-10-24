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
  const hostType = (entityFile.cache?.frontmatter as any)?.type as
    | string
    | undefined;
  // Treat person, project, task, fact, company, team, and meeting hosts as editable targets where we prefer a
  // simple default title (so user can immediately rename it)
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
    hostType === "team";
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

  // For editable hosts (person/project): use a simple and editable default title
  const baseTitle = isEditableHost
    ? "Untitled Fact"
    : displayName
    ? `${dateStamp} ${timeStamp} - ${displayName}`
    : `${dateStamp} ${timeStamp} - Fact`;
  const safeTitle = baseTitle.trim() || `${dateStamp} ${timeStamp}`;
  const slug = slugify(safeTitle);
  const safeFileBase = isEditableHost
    ? "Untitled Fact"
    : safeTitle.replace(/[\\/|?*:<>"]/g, "-");
  const fileName = safeFileBase.endsWith(".md")
    ? safeFileBase
    : `${safeFileBase}.md`;
  const filePath = normalizedFolder
    ? `${normalizedFolder}/${fileName}`
    : fileName;

  let factFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  let didCreate = false;

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
      date: isoTimestamp,
    });

    factFile = await app.vault.create(filePath, rendered);
    didCreate = true;
  }

  if (!factFile) {
    return null;
  }

  const validTargets = linkTargets.filter(
    (target) => target?.target?.file && target.property
  );

  await app.fileManager.processFrontMatter(factFile, (frontmatter) => {
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
        sourcePath: factFile!.path,
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
      // If created for an editable host (person/project), select the title to ease renaming
      if (didCreate && isEditableHost) {
        window.setTimeout(() => {
          try {
            focusAndSelectTitle(leaf);
          } catch (_) {
            // ignore
          }
        }, 150);
      }
    }
  }

  return factFile;
};

export default createFactForEntity;
