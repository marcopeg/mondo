import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import type { App, TFile } from "obsidian";

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sanitizeFolder = (rawPath: string | undefined): string => {
  if (!rawPath) {
    return "";
  }

  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
};

type CreateMeetingForPersonParams = {
  app: App;
  personFile: TCachedFile;
  openAfterCreate?: boolean;
};

export const createMeetingForPerson = async ({
  app,
  personFile,
  openAfterCreate = true,
}: CreateMeetingForPersonParams): Promise<TFile | null> => {
  if (!personFile?.file) {
    console.warn("createMeetingForPerson: missing person file reference");
    return null;
  }

  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createMeetingForPerson: CRM plugin instance not available");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const displayName = getEntityDisplayName(personFile);
  const rootPathSetting = settings.rootPaths?.[CRMFileType.MEETING] ?? "/";
  const normalizedFolder = sanitizeFolder(rootPathSetting);

  if (normalizedFolder) {
    const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
    if (!existingFolder) {
      await app.vault.createFolder(normalizedFolder);
    }
  }

  const now = new Date();
  const isoTimestamp = now.toISOString();
  const dateStamp = isoTimestamp.split("T")[0];
  const title = `${dateStamp} - ${displayName}`;
  const safeTitle = title.trim() || dateStamp;
  const slug = slugify(safeTitle);
  const safeFileBase = safeTitle.replace(/[\\/|?*:<>"]/g, "-");
  const fileName = safeFileBase.endsWith(".md") ? safeFileBase : `${safeFileBase}.md`;
  const filePath = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

  let meetingFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;

  if (!meetingFile) {
    const templateSource = getTemplateForType(
      settings.templates,
      CRMFileType.MEETING
    );

    const formattedTime = isoTimestamp.slice(11, 16);

    let content = renderTemplate(templateSource, {
      title: safeTitle,
      type: String(CRMFileType.MEETING),
      filename: fileName,
      slug,
      date: dateStamp,
      time: formattedTime,
      datetime: isoTimestamp,
    });

    const linkTarget = app.metadataCache.fileToLinktext(personFile.file, filePath);
    const participantLink = `  - "[[${linkTarget}|${displayName}]]"`;

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatterBody = frontmatterMatch[1];
      const fmLines = frontmatterBody.split("\n");
      const participantsIndex = fmLines.findIndex(
        (line) => line.trim().toLowerCase() === "participants:"
      );

      if (participantsIndex !== -1) {
        fmLines.splice(participantsIndex + 1, 0, participantLink);
      } else {
        fmLines.push("participants:");
        fmLines.push(participantLink);
      }

      const updatedFrontmatter = fmLines.join("\n");
      content = content.replace(frontmatterMatch[0], `---\n${updatedFrontmatter}\n---`);
    } else {
      content = [
        "---",
        `type: ${CRMFileType.MEETING}`,
        `show: ${JSON.stringify(safeTitle)}`,
        "participants:",
        participantLink,
        "---",
        content,
      ].join("\n");
    }

    meetingFile = await app.vault.create(filePath, content);
  }

  if (meetingFile && openAfterCreate) {
    const leaf = app.workspace.getLeaf(true);
    if (leaf && typeof (leaf as any).openFile === "function") {
      await (leaf as any).openFile(meetingFile);
    }
  }

  return meetingFile;
};

export default createMeetingForPerson;
