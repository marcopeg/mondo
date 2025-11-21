import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";
import { goal } from "./goal";

export const meeting = {
  name: "Meetings",
  singular: "Meeting",
  icon: "calendar-clock",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "date", prop: "date_time", linkToNote: true },
      { type: "link", prop: "references" },
      { type: "link", prop: "participants", mode: "bullet" },
    ],
    sort: {
      column: "date_time",
      direction: "desc",
    },
  },
  frontmatter: {
    participants: {
      type: "entity",
      title: "Participant",
      multiple: true,
      filter: {
        type: {
          in: ["person"],
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
      }
    },
    team: {
      type: "entity",
      title: "Team",
      multiple: true,
      filter: {
        type: {
          in: ["team"],
        },
      }
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
  linkAnythingOn: { types: ['project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
  createAnythingOn: { types: ['task', 'log', 'idea', 'fact', 'document', 'link']},
  links: [
    {
      type: "backlinks",
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["linksTo"],
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
        properties: ["linksTo"],
        title: "Logs",
        icon: log.icon,
        visibility: "notEmpty",
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
                    type: ["task", "log"],
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
