import type { App, TFile } from "obsidian";
import { CRMFileType as CRMFileTypeConst } from "@/types/CRMFileType";
import type { CRMFileType } from "@/types/CRMFileType";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type CreateOrOpenEntityParams = {
  app: App;
  entityType: CRMFileType;
  title: string;
  openAfterCreate?: boolean;
  createNewIfExists?: boolean;
};

export const createOrOpenEntity = async ({
  app,
  entityType,
  title,
  openAfterCreate = true,
  createNewIfExists = false,
}: CreateOrOpenEntityParams): Promise<TFile | null> => {
  const pluginInstance = (app as any).plugins?.plugins?.["crm"] as any;
  const settings = (pluginInstance as any)?.settings ?? {};
  const folderSetting =
    (settings.rootPaths && settings.rootPaths[entityType]) || "/";

  const normalizedFolder =
    folderSetting === "/"
      ? ""
      : folderSetting.replace(/^\/+/, "").replace(/\/+$/, "");

  if (normalizedFolder) {
    const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
    if (!existingFolder) {
      await app.vault.createFolder(normalizedFolder);
    }
  }

  const rawTitle = (title || "untitled").trim() || "untitled";
  const ensureNoExtension = (value: string): string =>
    value.toLowerCase().endsWith(".md") ? value.slice(0, -3) : value;
  const sanitizeFileName = (value: string): string =>
    value.replace(/[\\/]+/g, "-");

  const baseTitle = ensureNoExtension(rawTitle);
  const toFileName = (value: string): string => `${sanitizeFileName(value)}.md`;

  let finalTitle = baseTitle;
  let fileName = toFileName(finalTitle);
  let filePath = normalizedFolder
    ? `${normalizedFolder}/${fileName}`
    : fileName;

  if (createNewIfExists) {
    let attempt = 1;
    while (app.vault.getAbstractFileByPath(filePath)) {
      attempt += 1;
      finalTitle = `${baseTitle} ${attempt}`;
      fileName = toFileName(finalTitle);
      filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;
    }
  }

  let file = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  let createdFile: TFile | null = null;

  if (!file) {
    const now = new Date();
    const slugBase = sanitizeFileName(finalTitle);
    const slug = slugify(finalTitle) || slugBase.toLowerCase();
    const templateSource = getTemplateForType(
      (settings.templates || {}) as Partial<Record<CRMFileType, string>>,
      entityType
    );
    const isoTimestamp = now.toISOString();
    const content = renderTemplate(templateSource, {
      title: finalTitle,
      type: String(entityType),
      filename: fileName,
      slug,
      date: isoTimestamp.split("T")[0],
      time: isoTimestamp.slice(11, 16),
      datetime: isoTimestamp,
    });

    file = await app.vault.create(filePath, content);
    createdFile = file;
  }

  if (createdFile && entityType === CRMFileTypeConst.TASK) {
    try {
      const selfParticipant = resolveSelfPerson(app, createdFile.path);
      if (selfParticipant) {
        await addParticipantLink(app, createdFile, selfParticipant.link);
      }
    } catch (error) {
      console.error(
        "createOrOpenEntity: failed to assign self participant",
        error
      );
    }
  }

  if (openAfterCreate && file) {
    const leaf = app.workspace.getLeaf(true);
    if (leaf) {
      await (leaf as any).openFile(file);
    }
  }

  return file;
};

export default createOrOpenEntity;
