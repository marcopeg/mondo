export const project = {
  name: "Projects",
  icon: "folder-git-2",
  template:
    "\ndate: {{date}}\ncompany: []\nteam: []\nparticipants: []\nstatus: draft\n---\n",
  createRelated: [
    {
      key: "meeting",
      label: "Meeting",
      icon: "calendar-plus",
      panelKey: "meetings",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
        attributes: {
          type: "meeting",
          participants: ["{@this}"],
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
    columns: ["show"],
  },
  links: [
    {
      type: "backlinks",
      key: "meetings",
      config: {
        title: "Meetings",
        icon: "calendar",
        targetType: "meeting",
        properties: ["project"],
        filter: {
          any: [
            {
              "participants.length": {
                eq: 0,
              },
            },
            {
              "participants.length": {
                gt: 1,
              },
            },
          ],
        },
        sort: {
          strategy: "column",
          column: "date",
          direction: "desc",
        },
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "participants",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        createEntity: {
          enabled: true,
          title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
          attributes: {
            participants: ["{@this}"],
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["project"],
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
        properties: ["project"],
        title: "Logs",
        icon: "clipboard-list",
      },
    },
    {
      type: "backlinks",
      key: "documents",
      config: {
        targetType: "document",
        properties: ["project"],
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
        properties: ["project"],
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
