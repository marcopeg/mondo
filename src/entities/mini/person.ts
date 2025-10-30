export const person = {
  name: "People",
  icon: "user",
  createRelated: [
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      create: {
        attributes: {
          type: "task",
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      targetType: "task",
      properties: ["participants"],
    },
  ],
} as const;
