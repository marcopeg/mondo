import { CRM_ENTITIES, type CRMEntityType } from "@/entities";
import { DEFAULT_TEMPLATE } from "@/entities/default-template";
import type { CRMFileType } from "@/types/CRMFileType";

export { DEFAULT_TEMPLATE };

export const CRM_DEFAULT_TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.entries(CRM_ENTITIES).map(([type, config]) => [
      type,
      config.settings.template,
    ])
  )
) as Readonly<Record<CRMEntityType, string>>;

export const getDefaultTemplate = (type: CRMFileType): string => {
  // Only entity types have default templates
  // Special types like "log" and "journal" use the default
  if (type in CRM_DEFAULT_TEMPLATES) {
    return CRM_DEFAULT_TEMPLATES[type as CRMEntityType];
  }
  return DEFAULT_TEMPLATE;
};
