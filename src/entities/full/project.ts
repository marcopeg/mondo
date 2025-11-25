import { log } from "./log";
import { task } from "./task";

export const project = {
  name: "Projects",
  singular: "Project",
  icon: "folder-git-2",
  template:
    "\ndate: {{date}}\nstatus: draft\n---\n",
  
  list: {
    columns: [{ type: "title", prop: "show" }],
  },
  frontmatter: {
    company: {
      type: "entity",
      title: "Link to a Company",
      filter: {
        type: {
          in: ["company"],
        },
      },
      multiple: true,
    },
    team: {
      type: "entity",
      title: "Link to a Team",
      filter: {
        type: {
          in: ["team"],
        },
      },
      multiple: true,
    },
    role: {
      type: "entity",
      title: "Link to a Role",
      filter: {
        type: {
          in: ["role"],
        },
      },
      multiple: true,
    },
    location: {
      type: "entity",
      title: "Link to a Location",
      filter: {
        type: {
          in: ["location"],
        },
      },
      multiple: true,
    },
  },
  linkAnythingOn: { types: ['person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
   createRelated: [
      {
        key: "log",
        label: "Log",
        icon: log.icon,
        panelKey: "logs",
        targetType: "log",
        create: {
          title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
          attributes: {
            project: ["{@this}"],
          },
        },
      },
      {
        key: "task",
        label: "Task",
        icon: task.icon,
        panelKey: "tasks",
        targetType: "task",
        create: {
          attributes: {
            project: ["{@this}"],
          },
        },
      },
    ],
  createAnythingOn: { types: ['goal', 'task', 'log', 'idea', 'fact', 'document', 'link', 'article', 'book']},
  links: [
    {
      type: "backlinks",
      key: "log",
      config: {
        title: "Logs",
        icon: "file-text",
        visibility: "notEmpty",
        targetType: "log",
        properties: ["project"],
        sort: {
          strategy: "date",
          direction: "desc",
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
          referenceCreate: "log",
        },
      },
    },
    {
      type: "backlinks",
      key: "task",
      config: {
        title: "Tasks",
        icon: "check-square",
        visibility: "notEmpty",
        targetType: "task",
        properties: ["project"],
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
          referenceCreate: "task",
        },
      },
    },
    {
      type: "backlinks",
      key: "other-link",
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
                    property: "linksTo",
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
