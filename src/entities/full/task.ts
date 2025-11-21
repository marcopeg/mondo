import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { goal } from "./goal";

export const task = {
  name: "Tasks",
  singular: "Task",
  icon: "check-square",
  template: "\ndate: {{date}}\nstatus: todo\n---\n",
  list: {
    columns: [
      { type: "title", prop: "show" },
      { type: "link", prop: "participants" },
      { type: "value", prop: "status" },
    ],
  },
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
    team: {
      type: "entity",
      title: "Team",
      filter: {
        type: {
          in: ["team"],
        },
      }
    },
    project: {
      type: "entity",
      title: "Project",
      filter: {
        type: {
          in: ["project"],
        },
      }
    },
    participants: {
      type: "entity",
      title: "Participant",
      multiple: true,
      filter: {
        type: {
          in: ["person"],
        },
      }
    },
  },
  createRelated: [
    {
      key: "subtask",
      label: "Sub-Task",
      icon: "check-square",
      targetType: "task",
      create: {
        title: "Untitled Sub-Task for {@this.show}",
        attributes: {
          task: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      panelKey: "facts",
      targetType: "fact",
      create: {
        title: "Untitled Fact for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: log.icon,
      panelKey: "logs",
      targetType: "log",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
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
      icon: 'lightbulb',
      targetType: "idea",
      create: {
        title: "Untitled Idea for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
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
        properties: ["task"],
        title: "Tasks",
        icon: "check-square",
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
          referenceCreate: "subtask",
        },
      },
    },
    {
      type: "backlinks",
      key: "facts",
      config: {
        targetType: "fact",
        properties: ["linksTo"],
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
