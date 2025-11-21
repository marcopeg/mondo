import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { meeting } from "./meeting";
import { project } from "./project";
import { link } from "./link";
import { goal } from "./goal";

export const team = {
  name: "Teams",
  singular: "Team",
  icon: "users",
  template: "\ndate: {{date}}\ncompany: []\nlocation: []\n---\n",
  frontmatter: {
    company: {
      type: "entity",
      title: "Company",
      filter: {
        type: {
          in: ["company"],
        },
      },
    },
    location: {
      type: "entity",
      title: "Location",
      filter: {
        type: {
          in: ["location"],
        },
      }
    },
  },
  createRelated: [
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      targetType: "meeting",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} on {@this.show}",
        attributes: {
          team: ["{@this}"],
        },
      },
    },
    {
      key: "project",
      label: "Project",
      icon: project.icon,
      targetType: "project",
      create: {
        title: "New Project for {@this.show}",
        attributes: {
          team: ["{@this}"],
        },
      },
    },
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
    {
      key: "member",
      label: "Member",
      icon: 'user',
      targetType: "person",
      create: {
        title: "New Member for {@this.show}",
        attributes: {
          team: ["{@this}"],
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
          team: ["{@this}"],
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
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "link", prop: "company" },
      { type: "link", prop: "location" },
      { type: "members" },
    ],
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
        visibility: "notEmpty",
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
      key: "projects",
      config: {
        targetType: "project",
        properties: ["team"],
        title: "Projects",
        icon: "folder-git-2",
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
      key: "people",
      config: {
        targetType: "person",
        properties: ["team"],
        title: "People",
        icon: "users",
        visibility: "notEmpty",
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
            key: "role",
          },
          {
            type: "attribute",
            key: "location",
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
      key: "other-links",
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
                    property: ["linksTo"],
                    type: [],
                  },
                },
              ],
            },
          ],
        },
        columns: [
          { type: "entityIcon" },
          { type: "show" },
          { type: "cover", align: "right" },
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
