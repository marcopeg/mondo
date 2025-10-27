import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
status: draft
---
`;

const ideaConfig: CRMEntityConfig<"idea"> = {
  type: "idea",
  name: "Ideas",
  icon: "lightbulb",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "status"],
  },
  links: makeDefaultBacklinks(["idea"]),
};

export default ideaConfig;
