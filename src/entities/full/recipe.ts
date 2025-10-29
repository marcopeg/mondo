export const recipe = {
  name: "Cooking Book",
  icon: "book-open-check",
  template:
    "\ndate: {{date}}\ncategory: []\ncookTime:\ncalories:\n---\n\n## Ingredients\n\n- \n\n## Instructions\n\n1. \n\n",
  list: {
    columns: ["cover", "show", "source", "servings"],
  },
  links: [
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["recipe"],
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
        properties: ["recipe"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["recipe"],
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
        properties: ["recipe"],
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
