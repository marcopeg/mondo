import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
---
`;

const toolConfig: CRMEntityConfig<"tool"> = {
  type: "tool",
  name: "Tools",
  icon: "hammer",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "category", "owner", "location"],
  },
  links: DEFAULT_BACKLINKS,
};

export default toolConfig;
