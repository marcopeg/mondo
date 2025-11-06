import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { MondoFileType } from "@/types/MondoFileType";

export const DEFAULT_TEMPLATE = `---
type: {{type}}
date: {{date}}
---
`;

export const getDefaultTemplate = (type: MondoFileType): string => {
  // Only entity types have default templates
  // Special types like daily notes and journals use the default
  const maybeEntityType = type as MondoEntityType;
  const entityCfg = (MONDO_ENTITIES as Record<string, { template?: string }>)[
    maybeEntityType
  ];
  if (entityCfg && typeof entityCfg.template === "string") {
    return entityCfg.template as string;
  }
  return DEFAULT_TEMPLATE;
};
