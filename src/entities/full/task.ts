import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";

export const task = {
  name: "Tasks",
  icon: "check-square",
  template: "\ndate: {{date}}\nstatus: todo\n---\n",
  list: {
    columns: ["show", "participants", "status"],
  },
  createRelated: [
    {
      key: "subtask",
      label: "Sub-Task",
      icon: "check-square",
      targetType: "task",
      create: {
        title: "Untitled Sub-Task for {@this.show}",
        attributes: {
          task: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      panelKey: "facts",
      targetType: "fact",
      create: {
        title: "Untitled Fact for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: log.icon,
      panelKey: "logs",
      targetType: "log",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "document",
      label: "Document",
      icon: document.icon,
      targetType: "document",
      create: {
        title: "Untitled Document for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "idea",
      label: "Idea",
      icon: 'lightbulb',
      targetType: "idea",
      create: {
        title: "Untitled Idea for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["task"],
        title: "Tasks",
        icon: "check-square",
        visibility: "notEmpty",
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
        createEntity: {
          referenceCreate: "subtask",
        },
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["linksTo"],
        title: fact.name,
        icon: fact.icon,
        visibility: "notEmpty",
        sort: {
          strategy: "manual",
        },
        createEntity: {
          referenceCreate: "fact",
        },
      },
    },
    {
      type: "backlinks",
      key: "logs",
      config: {
        targetType: "log",
        properties: ["linksTo"],
        title: log.name,
        icon: log.icon,
        visibility: "notEmpty",
        createEntity: {
          referenceCreate: "log",
        },
      },
    },
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
                    property: ["linksTo", "task"],
                    type: ["task", "log", "fact"],
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
