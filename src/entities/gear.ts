import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date}}
owner: []
location: []
---
`;

const gearConfig: CRMEntityConfig<
  "gear",
  | { type: "documents"; collapsed?: boolean }
> = {
  type: "gear",
  name: "Gear",
  icon: "settings",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "owner", "location"],
  },
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default gearConfig;
