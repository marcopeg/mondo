import { App, TFile } from "obsidian";
import { getMondoPlugin } from "@/utils/getMondoPlugin";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/MondoTemplates";
import {
  MondoFileType,
  getMondoEntityConfig,
  isMondoEntityType,
} from "@/types/MondoFileType";
import { slugify } from "@/utils/createLinkedNoteHelpers";

const sanitizeFileBase = (value: string): string =>
  value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

const ensureFolderExists = async (app: App, folderPath: string) => {
  if (!folderPath) {
    return;
  }

  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) {
    return;
  }

  try {
    await app.vault.createFolder(folderPath);
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (!message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
};

const injectShowFrontmatter = (content: string, showValue: string): string => {
  const sanitizedShow = showValue.replace(/[\r\n]+/g, " ").trim();
  if (!sanitizedShow) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    return content;
  }

  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    return content;
  }

  const headerLines = lines.slice(0, closingIndex);
  const footerLine = lines[closingIndex];
  const rest = lines.slice(closingIndex + 1);

  const frontmatterLines = headerLines.slice(1);
  const typeIndex = frontmatterLines.findIndex((line) =>
    line.trim().toLowerCase().startsWith("type:")
  );
  const insertIndex =
    typeIndex >= 0 ? typeIndex + 1 : frontmatterLines.length;

  const escapedShow = sanitizedShow
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  const showLine = `show: "${escapedShow}"`;

  frontmatterLines.splice(insertIndex, 0, showLine);

  const finalLines = [
    headerLines[0],
    ...frontmatterLines,
    footerLine,
    ...rest,
  ];

  return finalLines.join("\n");
};

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\r\n]/;

export type CreateEntityNoteFromInputOptions = {
  app: App;
  entityType: string;
  input: string;
};

export const createEntityNoteFromInput = async ({
  app,
  entityType,
  input,
}: CreateEntityNoteFromInputOptions): Promise<TFile> => {
  const plugin = getMondoPlugin(app);
  if (!plugin) {
    throw new Error("Mondo plugin is not ready yet.");
  }

  const normalizedType = entityType.trim().toLowerCase();
  if (!isMondoEntityType(normalizedType)) {
    throw new Error(`Invalid Mondo entity type "${entityType}".`);
  }

  const typeKey = normalizedType as MondoFileType;
  const config = getMondoEntityConfig(typeKey);
  const label = config?.name ?? normalizedType;

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<MondoFileType, string>>;
    templates?: Partial<Record<MondoFileType, string>>;
  };

  const folderSetting = settings.rootPaths?.[typeKey] ?? "/";
  const normalizedFolder = normalizeFolderPath(folderSetting);
  if (normalizedFolder) {
    await ensureFolderExists(app, normalizedFolder);
  }

  const trimmedInput = input.trim();
  const displayTitle = trimmedInput || `Untitled ${label}`;
  const sanitizedInput = sanitizeFileBase(trimmedInput || displayTitle);
  const fileBaseRoot = sanitizedInput || `untitled-${Date.now()}`;

  let attempt = 0;
  let chosenBase = fileBaseRoot;
  let filePath = "";

  while (true) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const candidateBase = `${fileBaseRoot}${suffix}`;
    const candidateName = `${candidateBase}.md`;
    const candidatePath = normalizedFolder
      ? `${normalizedFolder}/${candidateName}`
      : candidateName;

    const existing = app.vault.getAbstractFileByPath(candidatePath);
    if (!existing) {
      chosenBase = candidateBase;
      filePath = candidatePath;
      break;
    }

    attempt += 1;
  }

  const now = new Date();
  const isoTimestamp = now.toISOString();
  const slugValue =
    slugify(displayTitle) || slugify(fileBaseRoot) || `${Date.now()}`;
  const templateSource = await getTemplateForType(
    app,
    settings.templates ?? {},
    typeKey
  );
  const rendered = renderTemplate(templateSource, {
    title: displayTitle,
    type: String(typeKey),
    filename: `${chosenBase}.md`,
    slug: slugValue,
    date: isoTimestamp,
    datetime: isoTimestamp,
  });

  const needsShow =
    trimmedInput.length > 0 && INVALID_FILENAME_CHARACTERS.test(trimmedInput);
  const content = needsShow
    ? injectShowFrontmatter(rendered, trimmedInput)
    : rendered;

  return (await app.vault.create(filePath, content)) as TFile;
};

export default createEntityNoteFromInput;
