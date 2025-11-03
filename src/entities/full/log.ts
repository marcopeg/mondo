export const log = {
  name: "Logs",
  icon: "file-clock",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: ["date", "show"],
    sort: {
      column: "date",
      direction: "desc",
    },
  },
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
                    property: ["linksTo", "log"],
                    // type: ["log"],
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
