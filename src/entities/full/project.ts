import { person } from "./person";
import { task } from "./task";
import { meeting } from "./meeting";
import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";
import { goal } from "./goal";

export const project = {
  name: "Projects",
  singular: "Project",
  icon: "folder-git-2",
  template:
    "\ndate: {{date}}\ncompany: []\nteam: []\nparticipants: []\nstatus: draft\n---\n",
  
  list: {
    columns: [{ type: "title", prop: "show" }],
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
          project: ["{@this}"],
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
          project: ["{@this}"],
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
          project: ["{@this}"],
        },
      },
    },
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      targetType: "meeting",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
        attributes: {
          project: ["{@this}"],
          participants: ["{@this.participants}"],
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
          project: ["{@this}"],
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
          project: ["{@this}"],
        },
      },
    },
    {
      key: "link",
      label: "Link",
      icon: link.icon,
      create: {
        title: "New Link for {@this.show}",
        attributes: {
          project: ["{@this}"],
        },
      },
    },
    {
      key: "goal",
      label: "Goal",
      icon: goal.icon,
      targetType: "goal",
      create: {
        title: "Untitled Goal for {@this.show}",
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
        properties: ["project"],
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
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["project"],
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
        properties: ["project"],
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
      key: "documents",
      config: {
        targetType: "document",
        properties: ["project"],
        title: document.name,
        icon: document.icon,
        visibility: "notEmpty",
        sort: {
          strategy: "manual",
        },
        createEntity: {
          referenceCreate: "document",
        },
      },
    },
    {
      type: "backlinks",
      key: "meetings",
      config: {
        title: meeting.name,
        icon: meeting.icon,
        visibility: "notEmpty",
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
          referenceCreate: "meeting",
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
                    property: ["linksTo", "project"],
                    type: ["fact", "task", "log", "document", "meeting"],
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
    {
      type: "backlinks",
      key: "linked_links",
      config: {
        targetType: "link",
        properties: ["project"],
        title: link.name,
        icon: link.icon,
        visibility: "notEmpty",
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "url",
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
          referenceCreate: "link",
        },
      },
    },
    {
      type: "backlinks",
      key: "goals",
      config: {
        targetType: "goal",
        properties: ["linksTo"],
        title: goal.name,
        icon: goal.icon,
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
          referenceCreate: "goal",
        },
      },
    },
  ],
} as const;
