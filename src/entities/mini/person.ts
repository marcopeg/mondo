export const person = {
  name: "People",
  icon: "user",
  links: [
    {
      type: "backlinks",
      targetType: "task",
      properties: ["participants"],
    },
  ],
} as const;
