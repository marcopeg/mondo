import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { AutoComplete } from "@/components/AutoComplete";
import type { TFile } from "obsidian";
import {
  MondoFileType,
  MONDO_FILE_TYPES,
  isMondoFileType,
} from "@/types/MondoFileType";
import { resolveMondoEntityType } from "@/entities";
import {
  getTemplateForType,
  renderTemplate,
} from "@/utils/MondoTemplates";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

interface QuickEntityProps {
  type: string; // e.g. "company" | "person" | "project"
  placeholder?: string;
}

const normalizeType = (value: string): MondoFileType => {
  const resolved = resolveMondoEntityType((value || "").toLowerCase());
  if (resolved) {
    return resolved;
  }

  if (isMondoFileType(value)) {
    return value;
  }

  return MONDO_FILE_TYPES[0];
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const QuickEntity = ({ type, placeholder }: QuickEntityProps) => {
  const entityType = normalizeType(type);
  const files = useFiles(entityType);
  const app = useApp();
  const pluginInstance = (app as any).plugins?.plugins?.["mondo"] as any;

  const onSelect = (val: string) => {
    (async () => {
      const match = files.find((c) => c.file.basename === val);
      if (match) {
        const leaf = app.workspace.getLeaf(true);
        if (leaf) {
          await (leaf as any).openFile(match.file);
        }
        return;
      }

      try {
        const settings = (pluginInstance as any)?.settings || {};
        const folderSetting =
          (settings.rootPaths && settings.rootPaths[entityType]) || "/";

        const normalizedFolder = normalizeFolderPath(folderSetting);

        if (normalizedFolder !== "") {
          const existing = app.vault.getAbstractFileByPath(normalizedFolder);
          if (!existing) {
            await app.vault.createFolder(normalizedFolder);
          }
        }

        const base = (val || "untitled").trim();
        const safeBase = base.replace(/[\\/]+/g, "-");
        const fileName = safeBase.endsWith(".md") ? safeBase : `${safeBase}.md`;
        const filePath = normalizedFolder
          ? `${normalizedFolder}/${fileName}`
          : fileName;

        let tfile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
        let createdFile: TFile | null = null;
        if (!tfile) {
          const now = new Date();
          const slug = slugify(base) || safeBase.toLowerCase();
          const settings = (pluginInstance as any)?.settings || {};
          const templateSource = await getTemplateForType(
            app,
            (settings.templates || {}) as Partial<Record<MondoFileType, string>>,
            entityType
          );
          const isoTimestamp = now.toISOString();
          const content = renderTemplate(templateSource, {
            title: base,
            type: String(entityType),
            filename: fileName,
            slug,
            date: isoTimestamp,
          });

          tfile = await app.vault.create(filePath, content);
          createdFile = tfile;
        }

        if (createdFile && entityType === MondoFileType.TASK) {
          try {
            const selfParticipant = resolveSelfPerson(app, createdFile.path);
            if (selfParticipant) {
              await addParticipantLink(app, createdFile, selfParticipant.link);
            }
          } catch (error) {
            console.error("QuickEntity: failed to assign self participant", error);
          }
        }

        const leaf = app.workspace.getLeaf(true);
        if (leaf && tfile) {
          await (leaf as any).openFile(tfile as TFile);
        }
      } catch (e) {
        console.error("QuickEntity: failed to create/open entity:", e);
      }
    })();
  };

  return (
    <AutoComplete
      values={files.map((c) => c.file.basename)}
      onSelect={onSelect}
      placeholder={placeholder}
      className="setting-input w-full"
    />
  );
};

export default QuickEntity;
