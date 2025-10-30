export const task = {
  name: "Tasks",
  icon: "check-square",
  template: "\ndate: {{date}}\nstatus: open\n---\n",
  createRelated: [
    {
      key: "subtask",
      label: "Sub-task",
      icon: "list-plus",
      panelKey: "tasks",
      create: {
        title: "Untitled Sub-task",
        attributes: {
          type: "task",
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panelKey: "facts",
      create: {
        attributes: {
          type: "fact",
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panelKey: "logs",
      create: {
        attributes: {
          type: "log",
        },
      },
    },
  ],
  list: {
    columns: ["show", "participants", "status"],
  },
  links: [
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["task"],
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
        properties: ["task"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["task"],
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
        properties: ["task"],
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
