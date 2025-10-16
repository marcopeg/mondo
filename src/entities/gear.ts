import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
owner: []
location: []
---

`;

const gearConfig: CRMEntityConfig<"gear"> = {
  type: "gear",
  name: "Gear",
  icon: "settings",
  dashboard: {
    placeholder: "Search gear...",
  },
  settings: {
    template: {
      default: template,
    },
  },
  list: {
    columns: ["show", "owner", "location"],
  },
};

export default gearConfig;
