import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: team
company:
area:
---

`;

const teamConfig: CRMEntityConfig<
  "team",
  | { type: "team-members"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "meetings"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "team-tasks"; collapsed?: boolean }
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
      collapsed: false,
      //... other configuration who'se type is specific to the "team-members" entity and that specific type should be defined in the TeamMembersLinks.tsx file and similar file block by block
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
      type: "team-tasks",
    },
  ],
};

export default teamConfig;
