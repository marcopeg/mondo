import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";

export const ingredient = {
  name: "Ingredients",
  icon: "carrot",
  template: "\ncategory: []\nsupplier: []\n---\n",
  list: {
    columns: ["cover", "show", "category", "supplier"],
  },
  createRelated: [
    {
      key: "task",
      label: "Task",
      icon: task.icon,
      targetType: "task",
      create: {
        title: "New Task for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: log.icon,
      targetType: "log",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      targetType: "fact",
      create: {
        title: "New Fact for {@this.show}",
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
      icon: idea.icon,
      targetType: "idea",
      create: {
        title: "New Idea for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      key: "recipes",
      config: {
        targetType: "recipe",
        properties: ["ingredients"],
        title: "Recipes",
        icon: "book-open-check",
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "cover",
          },
          {
            type: "show",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["linksTo"],
        title: task.name,
        icon: task.icon,
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
        find: {
          query: [
            {
              description: "Notes referencing this ingredient",
              steps: [
                {
                  notIn: {
                    property: "linksTo",
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
