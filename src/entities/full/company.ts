export const company = {
  name: "Companies",
  icon: "building-2",
  template: "\ndate: {{date}}\nlocation: []\n---\n",
  createRelated: [
    {
      key: "person",
      label: "Person",
      icon: "user-plus",
      panelKey: "employees",
      create: {
        attributes: {
          type: "person",
        },
      },
    },
    {
      key: "team",
      label: "Team",
      icon: "users",
      panelKey: "teams",
      create: {
        attributes: {
          type: "team",
        },
      },
    },
    {
      key: "project",
      label: "Project",
      icon: "folder-plus",
      panelKey: "projects",
      create: {
        attributes: {
          type: "project",
        },
      },
    },
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panelKey: "tasks",
      create: {
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
    columns: ["show", "location"],
  },
  links: [
    {
      type: "backlinks",
      key: "employees",
      desc: "Employees working at this company",
      config: {
        targetType: "person",
        properties: ["company"],
        title: "Employees",
        icon: "users",
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          {
            type: "cover",
          },
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "team",
          },
          {
            type: "attribute",
            key: "role",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "teams",
      desc: "Teams within this company",
      config: {
        targetType: "team",
        properties: ["company"],
        title: "Teams",
        icon: "layers",
        columns: [
          {
            type: "show",
          },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      desc: "Projects associated with this company",
      config: {
        targetType: "project",
        title: "Projects",
        icon: "folder-git-2",
        find: {
          query: [
            {
              description: "Direct projects linked via company property",
              steps: [
                {
                  in: {
                    property: ["company"],
                    type: "project",
                  },
                },
                {
                  unique: true,
                },
              ],
            },
            {
              description:
                "Projects linked to teams that belong to this company",
              steps: [
                {
                  in: {
                    property: ["company"],
                    type: "team",
                  },
                },
                {
                  in: {
                    property: ["team", "teams"],
                    type: "project",
                  },
                },
                {
                  unique: true,
                },
              ],
            },
          ],
          combine: "union",
        },
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "status",
          },
          {
            type: "attribute",
            key: "team",
          },
          {
            type: "date",
            align: "right",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["company"],
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
        properties: ["company"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["company"],
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
        properties: ["company"],
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
