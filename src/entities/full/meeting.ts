import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";

export const meeting = {
  name: "Meetings",
  icon: "calendar-clock",
  template: "\ndate: {{date}}\nparticipants: []\nlocation: []\n---\n",
  createRelated: [
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
  list: {
    columns: ["date_time", "participants"],
    sort: {
      column: "date_time",
      direction: "desc",
    },
  },
  links: [
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["meeting"],
        title: "Tasks",
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
      },
    },
    {
      type: "backlinks",
      key: "logs",
      config: {
        targetType: "log",
        properties: ["meeting"],
        title: "Logs",
        icon: log.icon,
        visibility: "notEmpty",
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
              steps: [
                {
                  notIn: {
                    property: ["linksTo", "meeting"],
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
