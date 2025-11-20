export const goal = {
  name: "Goals",
  singular: "Goal",
  icon: "target",
  template: "\ndate: {{date}}\nstatus: active\nlinksTo: []\n---\n",
  linkToAnythingOn: "linksTo",
  // frontmatter: {
  //   company: {
  //     type: "entity",
  //     title: "Company",
  //     key: "linksTo",
  //     filter: {
  //       type: {
  //         in: ["company"],
  //       },
  //     },
  //     multiple: true,
  //   },
  //   // team: {
  //   //   type: "entity",
  //   //   title: "Team",
  //   //   key: "linksTo",
  //   //   filter: {
  //   //     type: {
  //   //       in: ["team"],
  //   //     },
  //   //   },
  //   //   multiple: true,
  //   // },
  //   // role: {
  //   //   type: "entity",
  //   //   title: "Role",
  //   //   key: "linksTo",
  //   //   filter: {
  //   //     type: {
  //   //       in: ["role"],
  //   //     },
  //   //   },
  //   //   multiple: true,
  //   // },
  //   // person: {
  //   //   type: "entity",
  //   //   title: "Person",
  //   //   key: "linksTo",
  //   //   filter: {
  //   //     type: {
  //   //       in: ["person"],
  //   //     },
  //   //   },
  //   //   multiple: true,
  //   // },
  // },
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "value", prop: "status" },
      { type: "date", prop: "date" },
    ],
    sort: {
      column: "date",
      direction: "desc",
    },
  },
  createRelated: [
    {
      key: "log",
      label: "Log",
      icon: "file-text",
      targetType: "log",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      targetType: "task",
      create: {
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "idea",
      label: "Idea",
      icon: "lightbulb",
      targetType: "idea",
      create: {
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: "info",
      targetType: "fact",
      create: {
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "document",
      label: "Document",
      icon: "file-text",
      targetType: "document",
      create: {
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      key: "link",
      config: {
        title: "Links",
        icon: "layers",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  notIn: {
                    property: "linksTo",
                    type: [],
                  },
                },
              ],
            },
          ],
        },
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "entityIcon",
          },
          {
            type: "show",
          },
          {
            type: "cover",
            align: "right",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        createEntity: {
          enabled: false,
        },
      },
    },
  ],
} as const;
