import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";
import { create } from "domain";

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
      type: "backlinks",
      key: "reports",
      config: {
        title: "Reports",
        icon: "arrow-up-circle",
        find: {
          query: [
            {
              steps: [{ in: { property: ["reportsTo"], type: "person" } }],
            },
          ],
        },
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "role" },
        ],
        createEntity: {
          enabled: true,
          title: "Untitled Report",
          attributes: {
            reportsTo: "{@this}",
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "teammates",
      desc: "People who share at least one team with the host",
      config: {
        targetType: "person",
        title: "Teammates",
        icon: "users",
        find: {
          query: [
            {
              steps: [
                { out: { property: ["team", "teams"], type: "team" } },
                { in: { property: ["team", "teams"], type: "person" } },
                { not: "host" },
                { unique: true },
              ],
            },
          ],
          combine: "union",
        },
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "role" },
          { type: "attribute", key: "team" },
        ],
        createEntity: {
          title: "Untitled Teammate",
          attributes: {
            team: "{@this.team}",
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "1o1s",
      config: {
        targetType: "meeting",
        title: "1:1s",
        icon: "users",
        find: {
          query: [
            {
              steps: [
                {
                  in: { property: ["participants", "people"], type: "meeting" },
                },
              ],
            },
          ],
        },
        filter: {
          "participants.length": { eq: 1 },
        },
        sort: {
          strategy: "column",
          column: "date",
          direction: "desc",
        },
        pageSize: 5,
        columns: [{ type: "show" }, { type: "date", align: "right" }],
        createEntity: {
          enabled: true,
          title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
          attributes: {
            participants: ["{@this}"],
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "meetings",
      config: {
        targetType: "meeting",
        title: "Meetings",
        icon: "calendar",
        find: {
          query: [
            {
              description: "Direct backlinks via participants/people",
              steps: [
                {
                  in: { property: ["participants", "people"], type: "meeting" },
                },
              ],
            },
            {
              description: "Via teams (meetings backlink to teams)",
              steps: [
                { out: { property: ["team", "teams"], type: "team" } },
                { in: { property: ["team", "teams"], type: "meeting" } },
              ],
            },
          ],
        },
        filter: {
          any: [
            { "participants.length": { eq: 0 } },
            { "participants.length": { gt: 1 } },
          ],
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
          attributes: {
            participants: ["{@this}"],
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        targetType: "project",
        title: "Projects",
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
        find: {
          query: [
            {
              description: "Direct backlinks via participants/people",
              steps: [
                {
                  in: { property: ["participants", "people"], type: "project" },
                },
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
          title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
        },
      },
    },
    ...DEFAULT_BACKLINKS,
  ],
};

export default personConfig;
