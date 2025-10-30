export const task = {
  name: "Tasks",
  icon: "check-square",
  createRelated: [
    {
      key: "subtask",
      label: "Sub-task",
      icon: "list-plus",
      create: {
        title: "Untitled Sub-task",
        attributes: {
          type: "task",
        },
      },
    },
  ],
} as const;
