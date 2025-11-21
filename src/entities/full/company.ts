import { person } from "./person";
import { team } from "./team";
import { project } from "./project";
import { task } from "./task";
import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { meeting } from "./meeting";
import { link } from "./link";

export const company = {
  name: "Companies",
  singular: "Company",
  icon: "building-2",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "link", prop: "location" },
    ],
  },
  linkAnythingOn: {
    types: ["location"]
  },
  createRelated: [
    {
      key: "employee",
      label: "Employee",
      icon: person.icon,
      targetType: "person",
      create: {
        attributes: {
          company: ["{@this}"],
        },
      },
    },
    {
      key: "team",
      label: "Team",
      icon: team.icon,
      targetType: "team",
      create: {
        attributes: {
          company: ["{@this}"],
        },
      },
    },
    {
      key: "project",
      label: "Project",
      icon: project.icon,
      targetType: "project",
      create: {
        attributes: {
          company: ["{@this}"],
          status: "draft",
        },
      },
    },
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      targetType: "meeting",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} on {@this.show}",
        attributes: {
          company: ["{@this}"],
        },
      },
    },
  ],
  createAnythingOn: {
    types: ["fact", "log", "idea", "document", "link", "role", "goal", "task", "gear", "tool"]
  },
  links: [
    {
      type: "backlinks",
      key: "employees",
      config: {
        targetType: "person",
        properties: ["company"],
        title: "Employees",
        icon: person.icon,
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
            key: "team",
          },
          {
            type: "attribute",
            key: "role",
          },
        ],
        createEntity: {
          referenceCreate: "employee",
        },
      },
    },
    {
      type: "backlinks",
      key: "teams",
      config: {
        targetType: "team",
        properties: ["company"],
        title: "Teams",
        icon: team.icon,
        visibility: "notEmpty",
        columns: [
          {
            type: "show",
          },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        createEntity: {
          referenceCreate: "team",
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        targetType: "project",
        title: "Projects",
        icon: project.icon,
        visibility: "notEmpty",
        find: {
          query: [
            {
              description: "Direct projects linked via company property",
              steps: [
                {
                  in: {
                    property: ["company"],
                    type: "project",
                  },
                },
                {
                  unique: true,
                },
              ],
            },
            {
              description:
                "Projects linked to teams that belong to this company",
              steps: [
                {
                  in: {
                    property: ["company"],
                    type: "team",
                  },
                },
                {
                  in: {
                    property: ["team"],
                    type: "project",
                  },
                },
                {
                  unique: true,
                },
              ],
            },
          ],
          combine: "union",
        },
        sort: {
          strategy: "manual",
        },
        columns: [
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "status",
          },
          {
            type: "attribute",
            key: "team",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        createEntity: {
          referenceCreate: "project",
        },
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["company"],
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
        properties: ["company"],
        title: "Logs",
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
        properties: ["company"],
        title: `[deprecated] Documents`,
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
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["company"],
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
        createEntity: {
          referenceCreate: "task",
        },
      },
    },
    {
      type: "backlinks",
      key: "meetings",
      config: {
        targetType: "meeting",
        properties: ["company"],
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
      key: "links",
      config: {
        targetType: "link",
        properties: ["company"],
        title: `[deprecated] ${link.name}`,
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
