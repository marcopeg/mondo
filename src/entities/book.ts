import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date}}
---
`;

const bookConfig: CRMEntityConfig<
  "book",
  | { type: "documents"; collapsed?: boolean }
> = {
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
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default bookConfig;
