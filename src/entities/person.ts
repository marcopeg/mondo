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
      type: "teammates",
    },
    // 1o1s
    {
      type: "backlinks",
      targetType: "meeting",
      title: "1o1s",
      icon: "users",
      columns: [{ type: "show" }, { type: "date", align: "right" }],
      sort: {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
      find: {
        query: [
          {
            description:
              "Meetings that backlink to the host via participants/people",
            steps: [
              { in: { property: ["participants", "people"], type: "meeting" } },
              { unique: true },
            ],
          },
        ],
        combine: "union",
      },
      filter: {
        "participants.length": { eq: 1 },
      },
    },
    // Projects (also indirect through teams)
    {
      type: "backlinks",
      targetType: "project",
      title: "Projects (deep linked)",
      icon: "folder-git-2",
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
      sort: {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
      columns: [
        { type: "show" },
        { type: "attribute", key: "participants" },
        { type: "date", align: "right" },
      ],
      createEntity: {
        enabled: true,
        title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
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
