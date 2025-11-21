

export const recipe = {
  name: "Cooking Book",
  singular: "Recipe",
  icon: "book-open-check",
  template:
    "\ndate: {{date}}\ncategory: []\ncookTime:\ncalories:\n---\n\n## Ingredients\n\n- \n\n## Instructions\n\n1. \n\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "value", prop: "category" },
      { type: "value", prop: "cookingTime" },
      { type: "url" },
    ],
  },
  linkAnythingOn: { types: ['ingredient']},
  createAnythingOn: { types: ['task', 'log', 'idea', 'fact', 'document', 'link', 'article', 'book']},
  links: [
    {
      type: "backlinks",
      key: "log",
      config: {
        title: "Logs",
        icon: "file-text",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: "linksTo",
                    type: ["log"],
                  },
                },
              ],
            },
          ],
        },
        sort: {
          strategy: "date",
          direction: "desc",
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
          referenceCreate: "log",
        },
      },
    },
    {
      type: "backlinks",
      key: "task",
      config: {
        title: "Tasks",
        icon: "check-square",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: "linksTo",
                    type: ["task"],
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
          referenceCreate: "task",
        },
      },
    },
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
                    type: ["log", "task"],
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
