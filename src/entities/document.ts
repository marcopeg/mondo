import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
file:
---
`;

const documentConfig: CRMEntityConfig<"document"> = {
  type: "document",
  name: "Documents",
  icon: "file-text",
  aliases: ["documents"],
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "category", "file"],
  },
  links: [...DEFAULT_BACKLINKS],
};

export default documentConfig;
