import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date:YYYY-MM-DD}}
time: {{time:HH:mm}}
datetime: {{datetime}}
participants: []
company:
meeting:
task:
project:
parent:
next:
prev:
---

# Fact

`;

const factConfig: CRMEntityConfig<
  "fact",
  { type: "facts"; collapsed?: boolean }
> = {
  type: "fact",
  name: "Facts",
  icon: "bookmark",
  dashboard: {},
  settings: {
    template: {
      default: template,
    },
  },
  list: {
    columns: ["datetime", "show"],
    sort: { column: "datetime", direction: "desc" },
  },
  links: [
    {
      type: "facts",
    },
  ],
};

export default factConfig;
