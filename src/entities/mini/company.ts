export const company = {
  name: "Company",
  icon: "gear",
  createRelated: [
    {
      key: "person",
      label: "Person",
      icon: "user-plus",
      create: {
        attributes: {
          type: "person",
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      targetType: "person",
      properties: ["company"],
    },
  ],
} as const;
