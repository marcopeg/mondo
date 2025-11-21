export const goal = {
  name: "Goals",
  singular: "Goal",
  icon: "target",
  template: "\ndate: {{date}}\nstatus: active\nlinksTo: []\n---\n",
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "value", prop: "status" },
      { type: "date", prop: "date" },
    ],
    sort: {
      column: "date",
      direction: "desc",
    },
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project']},
  createAnythingOn: { types: ['task', 'log', 'idea', 'fact', 'document', 'link', 'article']},
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
