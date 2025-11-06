export const company = {
  name: "Company",
  singular: "Company",
  icon: "gear",
  createRelated: [
    {
      key: "person",
      label: "Person",
      icon: "user-plus",
      targetType: "person",
      create: {
        attributes: {},
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
