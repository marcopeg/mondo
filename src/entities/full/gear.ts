import { person } from "./person";
import { team } from "./team";
import { project } from "./project";
import { task } from "./task";
import { fact } from "./fact";
import { log } from "./log";
import { link } from "./link";
import { idea } from "./idea";
import { document } from "./document";

export const gear = {
  name: "Gear",
  singular: "Gear",
  icon: "settings",
  template: "\ndate: {{date}}\nowner: []\nlocation: []\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "link", prop: "owner" },
      { type: "link", prop: "location" },
    ],
  },
  frontmatter: {
    location: {
      type: "entity",
      title: "Location",
      filter: {
        type: {
          in: ["location"],
        },
      },
      multiple: true,
    },
    owner: {
      type: "entity",
      title: "Owner",
      filter: {
        type: {
          in: ["person"],
        },
      },
      multiple: true,
    },
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
  links: [
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
                    property: "linksTo",
                    type: [],
                  },
                },
              ],
            },
          ],
        },
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "entityIcon",
          },
          {
            type: "show",
          },
          {
            type: "cover",
            align: "right",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        createEntity: {
          enabled: false,
        },
      },
    },
  ],
} as const;
