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
  | { type: "participant-tasks"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
> = {
  type: "person",
  name: "People",
  icon: "user",
  aliases: ["people"],
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "company", "role", "team", "location"],
    sort: { column: "show", direction: "asc" },
  },
  links: [
    {
      type: "facts",
      collapsed: true,
    },
    {
      type: "logs",
      collapsed: true,
    },
    {
      type: "meetings",
      collapsed: true,
    },
    {
      type: "participant-tasks",
      collapsed: true,
    },
    {
      type: "projects",
      collapsed: true,
    },
    {
      type: "teammates",
      collapsed: true,
    },
  ],
};

export default personConfig;
