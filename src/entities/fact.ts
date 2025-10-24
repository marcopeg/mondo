import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date}}
participants: []
---
`;

const factConfig: CRMEntityConfig<
  "fact",
  { type: "facts"; collapsed?: boolean } | { type: "logs"; collapsed?: boolean }
> = {
  type: "fact",
  name: "Facts",
  icon: "bookmark",
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
      type: "facts",
    },
    {
      type: "logs",
    },
  ],
};

export default factConfig;
