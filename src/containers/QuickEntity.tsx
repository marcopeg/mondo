import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { AutoComplete } from "@/components/AutoComplete";
import {
  CRMFileType,
  CRM_FILE_TYPES,
  isCRMFileType,
} from "@/types/CRMFileType";
import { resolveCRMEntityType } from "@/entities";
import { createOrOpenEntity } from "@/utils/createOrOpenEntity";

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

export const QuickEntity = ({ type, placeholder }: QuickEntityProps) => {
  const entityType = normalizeType(type);
  const files = useFiles(entityType);
  const app = useApp();

  const onSelect = (val: string) => {
    (async () => {
      const trimmed = (val || "").trim();
      if (!trimmed) {
        return;
      }

      const match = files.find((c) => c.file.basename === trimmed);
      if (match) {
        const leaf = app.workspace.getLeaf(true);
        if (leaf) {
          await (leaf as any).openFile(match.file);
        }
        return;
      }

      try {
        await createOrOpenEntity({
          app,
          entityType,
          title: trimmed,
        });
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
