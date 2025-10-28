import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { MondoFileType } from "@/types/MondoFileType";

export const DEFAULT_TEMPLATE = `---
type: {{type}}
date: {{date}}
---
`;

export const MONDO_DEFAULT_TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.entries(MONDO_ENTITIES).map(([type, config]) => [
      type,
      config.template,
    ])
  )
) as Readonly<Record<MondoEntityType, string>>;

export const getDefaultTemplate = (type: MondoFileType): string => {
  // Only entity types have default templates
  // Special types like daily notes and journals use the default
  if (type in MONDO_DEFAULT_TEMPLATES) {
    return MONDO_DEFAULT_TEMPLATES[type as MondoEntityType];
  }
  return DEFAULT_TEMPLATE;
};
