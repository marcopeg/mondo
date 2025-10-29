export const ingredient = {
  name: "Ingredients",
  icon: "carrot",
  template: "\ncategory: []\nsupplier: []\n---\n",
  list: {
    columns: ["show", "category", "supplier"],
  },
  links: [
    {
      type: "backlinks",
      key: "recipes",
      config: {
        targetType: "recipe",
        properties: ["ingredients"],
        title: "Recipes",
        icon: "book-open-check",
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "cover",
          },
          {
            type: "show",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["ingredients"],
        title: "Facts",
        icon: "file-text",
        sort: {
          strategy: "manual",
        },
      },
    },
    {
      type: "backlinks",
      key: "logs",
      config: {
        targetType: "log",
        properties: ["ingredients"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["ingredients"],
        title: "Documents",
        icon: "paperclip",
        sort: {
          strategy: "manual",
        },
      },
    },
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["ingredients"],
        title: "Tasks",
        icon: "check-square",
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "status",
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
