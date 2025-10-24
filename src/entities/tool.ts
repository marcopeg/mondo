import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
category:
location: []
owner:
---
`;

const toolConfig: CRMEntityConfig<
  "tool",
  | { type: "documents"; collapsed?: boolean }
> = {
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
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default toolConfig;
