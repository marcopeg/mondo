import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { MondoFileType } from "@/types/MondoFileType";

export const DEFAULT_TEMPLATE = `---
type: {{type}}
date: {{date}}
---
`;

export const getDefaultTemplate = (type: MondoFileType): string => {
  // Resolve the template dynamically from the current entity config so that
  // runtime preset/config changes are always reflected (no stale cache).
  if (type in MONDO_ENTITIES) {
    const tmpl = MONDO_ENTITIES[type as MondoEntityType]?.template;
    if (typeof tmpl === "string" && tmpl.length > 0) {
      return tmpl;
    }
  }
  // Special types like daily notes and journals (non-entities) fall back here
  return DEFAULT_TEMPLATE;
};
