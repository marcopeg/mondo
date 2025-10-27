import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
owner: []
location: []
---
`;

const gearConfig: CRMEntityConfig<"gear"> = {
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
  links: makeDefaultBacklinks(["gear"]),
};

export default gearConfig;
