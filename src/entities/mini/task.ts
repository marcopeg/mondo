export const task = {
  name: "Tasks",
  singular: "Task",
  icon: "check-square",
  createRelated: [
    {
      key: "subtask",
      label: "Sub-task",
      icon: "list-plus",
      targetType: "task",
      create: {
        title: "Untitled Sub-task",
        attributes: {},
      },
    },
  ],
} as const;
