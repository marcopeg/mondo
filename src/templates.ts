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

export const getDefaultTemplate = (type: CRMFileType): string =>
  CRM_DEFAULT_TEMPLATES[type] ?? DEFAULT_TEMPLATE;
