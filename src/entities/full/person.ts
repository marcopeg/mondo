import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { meeting } from "./meeting";
import { project } from "./project";
import { team } from "./team";
import { task } from "./task";

export const person = {
  name: "People",
  icon: "user",
  template:
    "\ndate: {{date}}\nlocation: []\ncompany: []\nrole: []\nteam: []\n---\n",
  list: {
    columns: ["cover", "show", "company", "role", "team", "location"],
    sort: {
      column: "show",
      direction: "asc",
    },
  },
  createRelated: [
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      create: {
        title: "Untitled Fact for {@this.show}",
        attributes: {
          type: "fact",
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
      key: "project",
      label: "Project",
      icon: project.icon,
      create: {
        title: "Untitled Project for {@this.show}",
        attributes: {
          type: "project",
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "report",
      label: "Report",
      icon: "user",
      create: {
        title: "New Report for {@this.show}",
        attributes: {
          type: "person",
          reportsTo: ["{@this}"],
          company: ["{@this.company}"],
          area: ["{@this.area}"],
        },
      },
    },
    {
      key: "teammate",
      label: "Teammate",
      icon: team.icon,
      create: {
        title: "New Teammate for {@this.show}",
        attributes: {
          type: "person",
          company: ["{@this.company}"],
          area: ["{@this.area}"],
          team: ["{@this.team}"],
        },
      },
    },
    {
      key: "1o1s",
      label: "1:1 Meeting",
      icon: meeting.icon,
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} 1-1 with {@this.show}",
        attributes: {
          type: "meeting",
          participants: ["{@this}"],
        },
      },
    },
    {
      key: "task",
      label: "Task",
      icon: task.icon,
      create: {
        title: "Untitled Task for {@this.show}",
        attributes: {
          type: "task",
          linksTo: ["{@this}"],
        },
      },
    },
  ],
  links: [
    {
      type: "backlinks",
      key: "reports",
      description: "People who report to this person",
      config: {
        title: "Reports",
        icon: "arrow-up-circle",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: ["reportsTo"],
                    type: "person",
                  },
                },
              ],
            },
          ],
        },
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
        ],
        createEntity: {
          referenceCreate: "report",
        },
      },
    },
    {
      type: "backlinks",
      key: "teammates",
      config: {
        targetType: "person",
        title: "Teammates",
        icon: "users",
        find: {
          query: [
            {
              steps: [
                {
                  out: {
                    property: ["team", "teams"],
                    type: "team",
                  },
                },
                {
                  in: {
                    property: ["team", "teams"],
                    type: "person",
                  },
                },
                {
                  not: "host",
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
            key: "team",
          },
        ],
        createEntity: {
          referenceCreate: "teammate",
        },
      },
    },
    {
      type: "backlinks",
      key: "1o1s",
      config: {
        targetType: "meeting",
        title: "1:1s",
        icon: meeting.icon,
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: ["participants"],
                    type: "meeting",
                  },
                },
              ],
            },
          ],
        },
        filter: {
          "participants.length": {
            eq: 1,
          },
        },
        sort: {
          strategy: "column",
          column: "date",
          direction: "desc",
        },
        pageSize: 5,
        columns: [
          {
            type: "show",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        createEntity: {
          referenceCreate: "1o1s",
        },
      },
    },
    {
      type: "backlinks",
      key: "meetings",
      config: {
        title: "Meetings",
        icon: meeting.icon,
        find: {
          query: [
            {
              description: "Direct backlinks via participants/people",
              steps: [
                {
                  in: {
                    property: ["participants"],
                    type: "meeting",
                  },
                },
              ],
            },
            {
              description: "Via teams (meetings backlink to teams)",
              steps: [
                {
                  out: {
                    property: ["team"],
                    type: "team",
                  },
                },
                {
                  in: {
                    property: ["team"],
                    type: "meeting",
                  },
                },
              ],
            },
          ],
        },
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
          enabled: true,
          title: "{YY}-{MM}-{DD} {hh}.{mm} Untitled Meeting",
          attributes: {
            participants: ["{@this}"],
          },
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        title: project.name,
        icon: project.icon,
        find: {
          query: [
            {
              description: "Direct backlinks via participants/people",
              steps: [
                {
                  in: {
                    property: ["linksTo", "participants"],
                    type: "project",
                  },
                },
              ],
            },
            {
              description: "Via teams (projects backlink to teams)",
              steps: [
                {
                  out: {
                    property: ["team"],
                    type: "team",
                  },
                },
                {
                  in: {
                    property: ["team"],
                    type: "project",
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
          referenceCreate: "project",
        },
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["linksTo", "participants"],
        title: fact.name,
        icon: fact.icon,
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
        properties: ["linksTo", "participants"],
        title: log.name,
        icon: log.icon,
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
        properties: ["linksTo", "participants"],
        title: document.name,
        icon: document.icon,
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
        properties: ["linksTo", "participants"],
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
      key: "link",
      config: {
        title: "Links",
        icon: "layers",
        find: {
          query: [
            {
              steps: [
                {
                  notIn: {
                    property: "linksTo",
                    type: ["meeting", "log", "project", "person"],
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
  ],
} as const;
