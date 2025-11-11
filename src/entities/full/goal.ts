export const goal = {
  name: "Goals",
  singular: "Goal",
  icon: "target",
  template: "\ndate: {{date}}\nstatus: active\n---\n",
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
  createRelated: [
    {
      key: "goal",
      label: "Goal",
      icon: "target",
      targetType: "goal",
      create: {
        title: "Untitled Goal for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
  ],
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
  ],
} as const;
