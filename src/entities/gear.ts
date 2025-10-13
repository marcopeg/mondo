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
    helper: "Open or create new Gear",
    placeholder: "Search gear...",
  },
  settings: {
    entity: {
      helper: "type=gear",
    },
    template: {
      helper: "Template for new gear notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "owner", "location"],
  },
};

export default gearConfig;
