import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { meeting } from "./meeting";
import { project } from "./project";
import { team } from "./team";
import { task } from "./task";
import { goal } from "./goal";

export const person = {
  name: "People",
  singular: "Person",
  icon: "user",
  template:
    "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "link", prop: "company" },
      { type: "link", prop: "role" },
      { type: "link", prop: "team" },
      { type: "link", prop: "location" },
    ],
    sort: {
      column: "show",
      direction: "asc",
    },
  },
  frontmatter: {
    location: {
      type: "entity",
      title: "Location",
      filter: {
        type: {
          in: ["location"],
        },
      },
    },
    company: {
      type: "entity",
      title: "Company",
      filter: {
        type: {
          in: ["company"],
        },
      },
      multiple: true,
    },
    team: {
      type: "entity",
      title: "Team",
      filter: {
        type: {
          in: ["team"],
        },
      },
      multiple: true
    },
    role: {
      type: "entity",
      title: "Role",
      filter: {
        type: {
          in: ["role"],
        },
      },
      multiple: true,
    },
  },
  linkAnythingOn: true,
  createRelated: [
    {
      key: "1o1s",
      label: "1:1",
      icon: meeting.icon,
      targetType: "meeting",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} 1-1 with {@this.show}",
        attributes: {
          participants: ["{@this}"],
        },
      },
    },
    {
      key: "meeting",
      label: "Meeting",
      icon: meeting.icon,
      targetType: "meeting",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} by {@this.show}",
        attributes: {
          participants: ["{@this}"],
        },
      },
    },
    {
      key: "teammate",
      label: "Teammate",
      icon: team.icon,
      targetType: "person",
      create: {
        title: "New Teammate for {@this.show}",
        attributes: {
          company: ["{@this.company}"],
          area: ["{@this.area}"],
          team: ["{@this.team}"],
        },
      },
    },
    {
      key: "report",
      label: "Report",
      icon: "user",
      targetType: "person",
      create: {
        title: "New Report for {@this.show}",
        attributes: {
          reportsTo: ["{@this}"],
          company: ["{@this.company}"],
          area: ["{@this.area}"],
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
        visibility: "notEmpty",
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
        visibility: "notEmpty",
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
        visibility: "notEmpty",
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
          referenceCreate: "meeting",
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      config: {
        title: project.name,
        icon: project.icon,
        visibility: "notEmpty",
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
      key: "logs",
      config: {
        targetType: "log",
        properties: ["linksTo", "participants"],
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
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["linksTo", "participants"],
        title: task.name,
        icon: task.icon,
        visibility: "notEmpty",
        createEntity: {
          referenceCreate: "task",
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
