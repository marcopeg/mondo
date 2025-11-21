import { task } from "./task";
import { log } from "./log";
import { meeting } from "./meeting";
import { project } from "./project";

export const team = {
  name: "Teams",
  singular: "Team",
  icon: "users",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "link", prop: "company" },
      { type: "link", prop: "location" },
      { type: "members" },
    ],
  },
  linkAnythingOn: true,
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
  ],
  createAnythingOn: {
    types: ["fact", "log", "idea", "document", "link", "goal", "task", "gear", "tool"]
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
        properties: ["team"],
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
        properties: ["team"],
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
