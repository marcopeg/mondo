import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";

export const role = {
  name: "Roles",
  singular: "Role",
  icon: "briefcase",
  template: "---\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "link", prop: "people" },
    ],
    sort: {
      column: "show",
      direction: "asc",
    },
  },
  linkAnythingOn: {
    types: ["company"]
  },
  createRelated: [
    {
      key: "person",
      label: "Person",
      icon: task.icon,
      targetType: "person",
      create: {
        attributes: {
          role: ["{@this}"],
        },
      },
    }
  ],
  createAnythingOn: {
    types: ["fact", "log", "idea", "document", "link", "goal", "task", "gear", "tool"]
  },
  links: [
    {
      type: "backlinks",
      key: "people",
      config: {
        targetType: "person",
        properties: ["role"],
        title: "People",
        icon: "users",
        visibility: "notEmpty",
        collapsed: false,
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          {
            type: "cover",
          },
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "company",
          },
          {
            type: "attribute",
            key: "team",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "other-links",
      config: {
        title: "Links",
        icon: "layers",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  notIn: {
                    property: ["linksTo"],
                    type: [],
                  },
                },
              ],
            },
          ],
        },
        columns: [
          { type: "entityIcon" },
          { type: "show" },
          { type: "cover", align: "right" },
          { type: "date", align: "right" },
        ],
        sort: {
          strategy: "manual",
        },
        createEntity: {
          enabled: false,
        },
      },
    },
  ],
} as const;
