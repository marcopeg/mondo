import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
---
`;

const logConfig: CRMEntityConfig<
  "log",
  | { type: "facts"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
> = {
  type: "log",
  name: "Logs",
  icon: "file-clock",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["date", "show"],
    sort: { column: "date", direction: "desc" },
  },
  links: [
    {
      type: "documents",
      collapsed: true,
    },
    {
      type: "facts",
      collapsed: true,
    },
  ],
};

export default logConfig;
