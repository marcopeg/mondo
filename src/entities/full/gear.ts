export const gear = {
  name: "Gear",
  icon: "settings",
  template: "\ndate: {{date}}\nowner: []\nlocation: []\n---\n",
  list: {
    columns: ["cover", "show", "owner", "location"],
  },
  links: [
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["gear"],
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
        properties: ["gear"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["gear"],
        title: "Documents",
        icon: "paperclip",
        sort: {
          strategy: "manual",
        },
      },
    },
    {
      type: "backlinks",
      key: "reference-material",
      config: {
        title: "Reference material",
        icon: "layers",
        find: {
          query: [
            {
              description: "Notes referencing this gear",
              steps: [
                {
                  notIn: {
                    property: "reference",
                    type: ["meeting", "log"],
                  },
                },
              ],
            },
          ],
          combine: "union",
        },
        filter: {
          type: {
            nin: ["meeting", "log"],
          },
        },
        columns: [
          { type: "entityIcon" },
          { type: "show" },
          { type: "attribute", key: "type", label: "Type" },
          { type: "date", align: "right" },
        ],
        sort: {
          strategy: "manual",
        },
        createEntity: {
          enabled: false,
        },
      },
    },
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["gear"],
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
