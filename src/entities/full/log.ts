export const log = {
  name: "Logs",
  singular: "Log",
  icon: "file-clock",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "date", prop: "date" },
      { type: "title", prop: "show" },
    ],
    sort: {
      column: "date",
      direction: "desc",
    },
  },
  links: [
    {
      type: "backlinks",
      key: "linked_links",
      config: {
        targetType: "link",
        properties: ["log"],
        title: "Links",
        icon: "link",
        visibility: "notEmpty",
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "url",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        sort: {
          strategy: "manual",
        },
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
