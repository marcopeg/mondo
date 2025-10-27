import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
company: []
location: []
---
`;

const teamConfig: CRMEntityConfig<"team"> = {
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
      type: "backlinks",
      key: "people",
      config: {
        targetType: "person",
        properties: ["team"],
        title: "People",
        icon: "users",
        collapsed: false,
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "company" },
          { type: "attribute", key: "team" },
        ],
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        targetType: "project",
        properties: ["team"],
        title: "Projects",
        icon: "folder-git-2",
        columns: [
          { type: "show" },
          { type: "attribute", key: "status" },
          { type: "date", align: "right" },
        ],
        sort: {
          strategy: "manual",
        },
      },
    },
    ...makeDefaultBacklinks(["team"]),
  ],
};

export default teamConfig;
