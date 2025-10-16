import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: person
company:
role:
team:
location:
---

`;

const personConfig: CRMEntityConfig<
  "person",
  | { type: "teammates"; collapsed?: boolean }
  | { type: "meetings"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
> = {
  type: "person",
  name: "People",
  icon: "user",
  aliases: ["people"],
  dashboard: {
    helper: "Open or create a new Person",
    placeholder: "Search people...",
  },
  settings: {
    entity: {
      helper: "type=person",
    },
    template: {
      helper: "Template for new people notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "company", "role", "team", "location"],
    sort: { column: "show", direction: "asc" },
  },
  links: [
    {
      type: "teammates",
      //... other configuration who'se type is specific to the "teammates" entity and that specific type should be defined in the TeammatesLinks.tsx file and similar file block by block
    },
    {
      type: "meetings",
    },
    {
      type: "projects",
    },
    {
      type: "facts",
    },
  ],
};

export default personConfig;
