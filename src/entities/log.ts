import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date:YYYY-MM-DD}}
time: {{time:HH:mm}}
datetime: {{datetime}}
---
`;

const logConfig: CRMEntityConfig<
  "log",
  { type: "facts"; collapsed?: boolean }
> = {
  type: "log",
  name: "Logs",
  icon: "file-clock",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["datetime", "show"],
    sort: { column: "datetime", direction: "desc" },
  },
  links: [
    {
      type: "facts",
      collapsed: true,
    },
  ],
};

export default logConfig;
