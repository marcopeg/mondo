import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";

export const meeting = {
  name: "Meetings",
  singular: "Meeting",
  icon: "calendar-clock",
  template: "\ndate: {{date}}\nparticipants: []\nlocation: []\n---\n",
  createRelated: [
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panelKey: "tasks",
      targetType: "task",
      create: {
        attributes: {},
      },
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panelKey: "logs",
      targetType: "log",
      create: {
        attributes: {},
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panelKey: "facts",
      targetType: "fact",
      create: {
        attributes: {},
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
    {
      key: "link",
      label: "Link",
      icon: link.icon,
      create: {
        title: "New Link for {@this.show}",
        attributes: {
          type: "link",
          meeting: ["{@this}"],
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
      key: "linked_links",
      config: {
        targetType: "link",
        properties: ["meeting"],
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
      },
    },
  ],
} as const;
