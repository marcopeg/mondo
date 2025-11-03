import { person } from "./person";
import { team } from "./team";
import { project } from "./project";
import { task } from "./task";
import { fact } from "./fact";
import { log } from "./log";
import { gear } from "./gear";
import { idea } from "./idea";
import { document } from "./document";
import { meeting } from "./meeting";

export const company = {
  name: "Companies",
  icon: "building-2",
  template: "\ndate: {{date}}\nlocation: []\n---\n",
  list: {
    columns: ["cover", "show", "location"],
  },
  createRelated: [
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} on {@this.show}",
        attributes: {
          type: "meeting",
          company: ["{@this}"],
        },
      },
    },
    {
      key: "employee",
      label: "Person",
      icon: person.icon,
      create: {
        title: "New Employee for {@this.show}",
        attributes: {
          type: "person",
          company: ["{@this}"],
        },
      },
    },
    {
      key: "team",
      label: "Team",
      icon: team.icon,
      create: {
        title: "New Team for {@this.show}",
        attributes: {
          type: "team",
          company: ["{@this}"],
        },
      },
    },
    {
      key: "project",
      label: "Project",
      icon: project.icon,
      create: {
        title: "New Project for {@this.show}",
        attributes: {
          type: "project",
          company: ["{@this}"],
          team: [],
          status: "draft",
        },
      },
    },
    {
      key: "task",
      label: "Task",
      icon: task.icon,
      create: {
        title: "New Task for {@this.show}",
        attributes: {
          type: "task",
          company: ["{@this}"],
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
          company: ["{@this}"],
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
          company: ["{@this}"],
        },
      },
    },
    {
      key: "gear",
      label: "Gear",
      icon: gear.icon,
      create: {
        title: "Untitled Gear for {@this.show}",
        attributes: {
          type: "gear",
          company: ["{@this}"],
        },
      },
    },
    {
      key: "idea",
      label: "Idea",
      icon: idea.icon,
      create: {
        title: "Untitled Idea for {@this.show}",
        attributes: {
          type: "idea",
          company: ["{@this}"],
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
          company: ["{@this}"],
        },
      },
    },
  ],
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
                    property: ["team", "teams"],
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
        title: "Facts",
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
        title: "Documents",
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
  ],
} as const;
