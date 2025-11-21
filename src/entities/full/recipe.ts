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
