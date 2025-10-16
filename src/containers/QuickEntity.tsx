import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { AutoComplete } from "@/components/AutoComplete";
import type { TFile } from "obsidian";
import {
  CRMFileType,
  CRM_FILE_TYPES,
  isCRMFileType,
} from "@/types/CRMFileType";
import { resolveCRMEntityType } from "@/entities";
import {
  getTemplateForType,
  renderTemplate,
} from "@/utils/CRMTemplates";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";

interface QuickEntityProps {
  type: string; // e.g. "company" | "person" | "project"
  placeholder?: string;
}

const normalizeType = (value: string): CRMFileType => {
  const resolved = resolveCRMEntityType((value || "").toLowerCase());
  if (resolved) {
    return resolved;
  }

  if (isCRMFileType(value)) {
    return value;
  }

  return CRM_FILE_TYPES[0];
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
  const pluginInstance = (app as any).plugins?.plugins?.["crm"] as any;

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

        const normalizedFolder =
          folderSetting === "/"
            ? ""
            : folderSetting.replace(/^\/+/, "").replace(/\/+$/, "");

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
            (settings.templates || {}) as Partial<Record<CRMFileType, string>>,
            entityType
          );
          const isoTimestamp = now.toISOString();
          const content = renderTemplate(templateSource, {
            title: base,
            type: String(entityType),
            filename: fileName,
            slug,
            date: isoTimestamp.split("T")[0],
            time: isoTimestamp.slice(11, 16),
            datetime: isoTimestamp,
          });

          tfile = await app.vault.create(filePath, content);
          createdFile = tfile;
        }

        if (createdFile && entityType === CRMFileType.TASK) {
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
