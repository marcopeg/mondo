import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import type { App, TFile } from "obsidian";

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
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(inlineTitleEl);
        selection.addRange(range);
      }
    } catch (_) {
      // no-op if selection APIs are unavailable
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

  return false;
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type MeetingLinkTarget = {
  property: string;
  mode: "single" | "list";
  target: TCachedFile;
};

type CreateMeetingForEntityParams = {
  app: App;
  entityFile: TCachedFile;
  linkTargets: MeetingLinkTarget[];
  openAfterCreate?: boolean;
};

const buildWikiLink = ({
  app,
  meetingPath,
  targetFile,
  displayName,
}: {
  app: App;
  meetingPath: string;
  targetFile: TFile;
  displayName: string;
}) => {
  const linkTarget = app.metadataCache.fileToLinktext(targetFile, meetingPath);
  const alias = displayName ? `|${displayName}` : "";
  return `[[${linkTarget}${alias}]]`;
};

const injectLinkTargets = ({
  content,
  linkTargets,
  app,
  meetingPath,
}: {
  content: string;
  linkTargets: MeetingLinkTarget[];
  app: App;
  meetingPath: string;
}): string => {
  if (linkTargets.length === 0) {
    return content;
  }

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content;
  }

  const [fullMatch, frontmatterBody] = frontmatterMatch;
  const lines = frontmatterBody.split("\n");

  const findKeyIndex = (key: string) =>
    lines.findIndex((line) =>
      line.trim().toLowerCase().startsWith(`${key.toLowerCase()}:`)
    );

  const ensureListEntry = (key: string, valueLine: string) => {
    const normalizedKey = `${key.toLowerCase()}:`;
    let keyIndex = lines.findIndex(
      (line) => line.trim().toLowerCase() === normalizedKey
    );

    if (keyIndex === -1) {
      keyIndex = findKeyIndex(key);
    }

    if (keyIndex === -1) {
      lines.push(`${key}:`);
      lines.push(valueLine);
      return;
    }

    if (lines[keyIndex].trim().toLowerCase() !== normalizedKey) {
      lines[keyIndex] = `${key}:`;
    }

    let insertIndex = keyIndex + 1;
    while (
      insertIndex < lines.length &&
      lines[insertIndex].trim().startsWith("-")
    ) {
      if (lines[insertIndex].trim() === valueLine.trim()) {
        return;
      }
      insertIndex += 1;
    }

    lines.splice(insertIndex, 0, valueLine);
  };

  const ensureSingleEntry = (key: string, valueLine: string) => {
    const keyIndex = findKeyIndex(key);
    if (keyIndex === -1) {
      lines.push(valueLine);
      return;
    }

    lines[keyIndex] = valueLine;
  };

  linkTargets.forEach(({ property, mode, target }) => {
    const targetFile = target?.file;
    if (!targetFile) {
      return;
    }

    const displayName = getEntityDisplayName(target);
    const wikiLink = buildWikiLink({
      app,
      meetingPath,
      targetFile,
      displayName,
    });
    const quotedLink = JSON.stringify(wikiLink);

    if (mode === "list") {
      ensureListEntry(property, `  - ${quotedLink}`);
    } else {
      ensureSingleEntry(property, `${property}: ${quotedLink}`);
    }
  });

  const updatedFrontmatter = lines.join("\n");
  return content.replace(fullMatch, `---\n${updatedFrontmatter}\n---`);
};

export const createMeetingForEntity = async ({
  app,
  entityFile,
  linkTargets,
  openAfterCreate = true,
}: CreateMeetingForEntityParams): Promise<TFile | null> => {
  if (!entityFile?.file) {
    console.warn("createMeetingForEntity: missing entity file reference");
    return null;
  }

  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createMeetingForEntity: CRM plugin instance not available");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const displayName = getEntityDisplayName(entityFile);
  const isPersonHost =
    (entityFile.cache?.frontmatter as any)?.type === "person";
  const isProjectHost =
    (entityFile.cache?.frontmatter as any)?.type === "project";
  const isTeamHost = (entityFile.cache?.frontmatter as any)?.type === "team";
  const rootPathSetting = settings.rootPaths?.[CRMFileType.MEETING] ?? "/";
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
  const title = isPersonHost
    ? `${dateStamp} with ${displayName}`
    : isProjectHost
    ? `${dateStamp} on ${displayName}`
    : isTeamHost
    ? `${dateStamp} with ${displayName}`
    : `${dateStamp} - ${displayName}`;
  const safeTitle = title.trim() || dateStamp;
  const slug = slugify(safeTitle);
  const safeFileBase = safeTitle.replace(/[\\/|?*:<>"]/g, "-");
  const fileName = safeFileBase.endsWith(".md")
    ? safeFileBase
    : `${safeFileBase}.md`;
  const filePath = normalizedFolder
    ? `${normalizedFolder}/${fileName}`
    : fileName;

  let meetingFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  let didCreate = false;

  if (!meetingFile) {
    const templateSource = await getTemplateForType(
      app,
      settings.templates,
      CRMFileType.MEETING
    );

    const formattedTime = isoTimestamp.slice(11, 16);

    const rendered = renderTemplate(templateSource, {
      title: safeTitle,
      type: String(CRMFileType.MEETING),
      filename: fileName,
      slug,
      date: dateStamp,
      time: formattedTime,
      datetime: isoTimestamp,
    });

    const validTargets = linkTargets.filter((target) => target?.target?.file);
    const contentWithLinks = injectLinkTargets({
      content: rendered,
      linkTargets: validTargets,
      app,
      meetingPath: filePath,
    });

    meetingFile = await app.vault.create(filePath, contentWithLinks);
    didCreate = true;
  }

  if (meetingFile && openAfterCreate) {
    const leaf = app.workspace.getLeaf(false);
    if (leaf && typeof (leaf as any).openFile === "function") {
      await (leaf as any).openFile(meetingFile);
      // If created for a person, project, or team, select the title to ease renaming
      if (didCreate && (isPersonHost || isProjectHost || isTeamHost)) {
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

  return meetingFile;
};

type CreateMeetingForPersonParams = {
  app: App;
  personFile: TCachedFile;
  openAfterCreate?: boolean;
};

export const createMeetingForPerson = ({
  app,
  personFile,
  openAfterCreate = true,
}: CreateMeetingForPersonParams) =>
  createMeetingForEntity({
    app,
    entityFile: personFile,
    linkTargets: [
      {
        property: "participants",
        mode: "list",
        target: personFile,
      },
    ],
    openAfterCreate,
  });

export default createMeetingForPerson;
