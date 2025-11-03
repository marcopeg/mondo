import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";

export const idea = {
  name: "Ideas",
  icon: "lightbulb",
  template: "\ndate: {{date}}\nstatus: draft\n---\n",
  list: {
    columns: ["show", "status"],
  },
  createRelated: [
    {
      key: "task",
      label: "Task",
      icon: task.icon,
      create: {
        title: "New Task for {@this.show}",
        attributes: {
          type: "task",
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: log.icon,
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
        attributes: {
          type: "log",
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      create: {
        title: "New Fact for {@this.show}",
        attributes: {
          type: "fact",
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "document",
      label: "Document",
      icon: document.icon,
      create: {
        title: "Untitled Document for {@this.show}",
        attributes: {
          type: "document",
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
        properties: ["linksTo"],
        title: task.name,
        icon: task.icon,
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
          referenceCreate: "task",
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
      key: "links",
      config: {
        title: "Links",
        icon: "layers",
        visibility: "notEmpty",
        find: {
          query: [
            {
              description: "Notes referencing this idea",
              steps: [
                {
                  notIn: {
                    property: ["linksTo", "idea"],
                    type: ["log", "task"],
                  },
                },
              ],
            },
          ],
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
  ],
} as const;
