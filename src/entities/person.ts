import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

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
      type: "meetings",
    },
    {
      // Also lists indirect through teams
      type: "projects",
    },
    {
      type: "teammates",
    },
    {
      type: "backlinks",
      targetType: "project",
      properties: ["participants"],
      title: "Projects (linked)",
      icon: "folder-git-2",
      columns: [
        { type: "show" },
        { type: "attribute", key: "participants" },
        { type: "date", align: "right" },
      ],
      sort: {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
      createEntity: {
        enabled: true,
        title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
      },
    },
    {
      type: "backlinks",
      targetType: "project",
      title: "Projects (deep linked)",
      icon: "folder-tree",
      columns: [
        { type: "show" },
        { type: "attribute", key: "participants" },
        { type: "date", align: "right" },
      ],
      sort: {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
      find: {
        query: [
          {
            description: "Direct backlinks via participants/people",
            steps: [
              { in: { property: ["participants", "people"], type: "project" } },
              { unique: true },
            ],
          },
          {
            description: "Via teams (projects backlink to teams)",
            steps: [
              { out: { property: ["team", "teams"], type: "team" } },
              { in: { property: ["team", "teams"], type: "project" } },
              { unique: true },
            ],
          },
        ],
        combine: "union",
      },
      filter: {
        "participants.length": { gt: 1 },
      },
      createEntity: {
        enabled: true,
        title: "Untitled Project",
      },
    },
    {
      type: "backlinks",
      targetType: "person",
      properties: ["reportsTo"],
      title: "Reports",
      icon: "arrow-up-circle",
      columns: [
        { type: "cover" },
        { type: "show" },
        { type: "attribute", key: "role" },
      ],
      sort: {
        strategy: "column",
        column: "show",
        direction: "asc",
      },
      createEntity: {
        enabled: true,
        title: "New Report",
        attributes: {
          company: "{@this.company}",
          team: "{@this.team}",
          reportsTo: "{@this}",
        },
      },
    },
    ...DEFAULT_BACKLINKS,
  ],
};

export default personConfig;
