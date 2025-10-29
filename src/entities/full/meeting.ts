export const meeting = {
  name: "Meetings",
  icon: "calendar-clock",
  template: "\ndate: {{date}}\nparticipants: []\nlocation: []\n---\n",
  list: {
    columns: ["date_time", "participants"],
    sort: {
      column: "date_time",
      direction: "desc",
    },
  },
  links: [
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["meeting"],
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
        properties: ["meeting"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["meeting"],
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
        properties: ["meeting"],
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
