export const person = {
  name: "People",
  singular: "Person",
  icon: "user",
  createRelated: [
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      targetType: "task",
      create: {
        attributes: {},
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
