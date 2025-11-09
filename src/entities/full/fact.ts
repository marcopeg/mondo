export const fact = {
  name: "Facts",
  singular: "Fact",
  icon: "bookmark",
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
      key: "link",
      config: {
        title: "Links",
        icon: "layers",
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
    {
      type: "backlinks",
      key: "linked_links",
      config: {
        targetType: "link",
        properties: ["fact"],
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
  ],
} as const;
