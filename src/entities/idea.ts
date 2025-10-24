import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date}}
type: idea
status: draft
related:
---
`;

const ideaConfig: CRMEntityConfig<
  "idea",
  { type: "facts"; collapsed?: boolean } | { type: "logs"; collapsed?: boolean }
> = {
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
  links: [
    { type: "facts", collapsed: true },
    { type: "logs", collapsed: true },
  ],
};

export default ideaConfig;
