import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { meeting } from "./meeting";

export const team = {
  name: "Teams",
  icon: "users",
  template: "\ndate: {{date}}\ncompany: []\nlocation: []\n---\n",
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
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      create: {
        title: "{YY}-{MM}-{DD} Meeting for {@this.show}",
        attributes: {
          type: "meeting",
          linksTo: ["{@this}"],
        },
      },
    },
  ],
  list: {
    columns: ["show", "company", "area"],
  },
  links: [
    {
      type: "backlinks",
      key: "meetings",
      config: {
        targetType: "meeting",
        properties: ["team"],
        title: meeting.name,
        icon: meeting.icon,
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
        sort: {
          strategy: "manual",
        },
        createEntity: {
          referenceCreate: "meeting",
        },
      },
    },
    {
      type: "backlinks",
      key: "people",
      config: {
        targetType: "person",
        properties: ["team"],
        title: "People",
        icon: "users",
        collapsed: false,
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
            key: "company",
          },
          {
            type: "attribute",
            key: "team",
          },
        ],
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        targetType: "project",
        properties: ["team"],
        title: "Projects",
        icon: "folder-git-2",
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
              description: "Notes referencing this team",
              steps: [
                {
                  notIn: {
                    property: "linksTo",
                    type: ["log", "task"],
                  },
                },
              ],
            }
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
