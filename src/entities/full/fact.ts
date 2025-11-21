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
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
  createAnythingOn: { types: ['fact', 'task', 'log', 'idea']},
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
