import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import type { App, TFile } from "obsidian";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

// Focuses the title element (inline title or input) and selects all its content
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;

  // 1) Try inline title (contenteditable element)
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

  // 2) Try title input (when inline title is configured as an input)
  const titleInput: HTMLInputElement | undefined =
    view?.fileView?.inputEl ?? view?.titleEl?.querySelector?.("input");
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
    return true;
  }

  // 3) Fallback: trigger rename command (opens rename UI)
  const executed = (
    view?.app ?? (window as any)?.app
  )?.commands?.executeCommandById?.("app:rename-file");
  return Boolean(executed);
};

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
  const hostType = (entityFile.cache?.frontmatter as any)?.type as
    | string
    | undefined;
  // Treat person, project, task, fact, company, and meeting hosts as editable targets where we prefer a
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
    hostType === "company";
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
      date: dateStamp,
      time: timeStamp,
      datetime: isoTimestamp,
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
    frontmatter.date = dateStamp;
    frontmatter.time = timeStamp;
    frontmatter.datetime = isoTimestamp;

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
