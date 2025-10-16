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
> = {
  type: "team",
  name: "Teams",
  icon: "users",
  dashboard: {
    helper: "Open or create a new Team",
    placeholder: "Search teams...",
  },
  settings: {
    entity: {
      helper: "type=team",
    },
    template: {
      helper: "Template for new teams notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "company", "area"],
  },
  links: [
    {
      type: "team-members",
      //... other configuration who'se type is specific to the "team-members" entity and that specific type should be defined in the TeamMembersLinks.tsx file and similar file block by block
    },
    {
      type: "projects",
    },
    {
      type: "meetings",
    },
  ],
};

export default teamConfig;
