import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";

export const newsletter = {
  name: "Newsletters",
  icon: "send",
  template: "\ndate: {{date}}\nfrequency:\ncategory: []\nauthor: []\n---\n",
  list: {
    columns: ["show", "frequency", "category", "author"],
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
    {
      key: "idea",
      label: "Idea",
      icon: idea.icon,
      create: {
        title: "New Idea for {@this.show}",
        attributes: {
          type: "idea",
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
              description: "Notes referencing this newsletter",
              steps: [
                {
                  notIn: {
                    property: ["linksTo", "newsletter"],
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
