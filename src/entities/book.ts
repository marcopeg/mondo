import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
---
`;

const bookConfig: CRMEntityConfig<"book"> = {
  type: "book",
  name: "Books",
  icon: "book",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "author", "status", "genre"],
  },
  links: DEFAULT_BACKLINKS,
};

export default bookConfig;
