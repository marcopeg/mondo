import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
location: []
company: []
role: []
team: []
---
`;

const personConfig: CRMEntityConfig<"person"> = {
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
      type: "documents",
    },
    {
      type: "facts",
    },
    {
      type: "logs",
    },
    {
      type: "meetings",
    },
    {
      type: "participant-tasks",
    },
    {
      type: "projects",
    },
    {
      type: "teammates",
    },
    {
      type: "backlinks",
      targetType: "person",
      properties: ["reportsTo"],
      title: "Reports",
      icon: "arrow-up-circle",
      visibility: "notEmpty",
    },
  ],
};

export default personConfig;
