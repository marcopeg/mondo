export const article = {
  name: "Articles",
  singular: "Article",
  icon: "newspaper",
  template: "\ndate: {{date}}\nstatus: draft\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "link", prop: "author" },
      { type: "value", prop: "status" },
      { type: "value", prop: "source" },
    ],
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project']},
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
