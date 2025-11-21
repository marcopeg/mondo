export const show = {
  name: "Shows",
  singular: "Show",
  icon: "clapperboard",
  template: "\ndate: {{date}}\nformat: movie\ngenre: []\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "value", prop: "format" },
      { type: "value", prop: "status" },
      { type: "value", prop: "platform" },
      { type: "date", prop: "release_date" },
    ],
  },
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
