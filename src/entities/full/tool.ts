import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";

export const tool = {
  name: "Tools",
  singular: "Tool",
  icon: "hammer",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "value", prop: "category" },
      { type: "link", prop: "owner" },
      { type: "link", prop: "location" },
    ],
  },
  links: [
    {
      type: "backlinks",
      key: "link",
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
