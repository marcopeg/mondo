import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
company: []
location: []
---
`;

const teamConfig: CRMEntityConfig<
  "team",
  | { type: "team-members"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "meetings"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "team-tasks"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
> = {
  type: "team",
  name: "Teams",
  icon: "users",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "company", "area"],
  },
  links: [
    {
      type: "team-members",
    },
    {
      type: "projects",
    },
    {
      type: "meetings",
    },
    {
      type: "facts",
    },
    {
      type: "logs",
    },
    {
      type: "team-tasks",
    },
  ],
};

export default teamConfig;
