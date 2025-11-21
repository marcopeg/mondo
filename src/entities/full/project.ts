import { person } from "./person";
import { task } from "./task";
import { meeting } from "./meeting";
import { fact } from "./fact";
import { log } from "./log";
import { document } from "./document";
import { idea } from "./idea";
import { link } from "./link";
import { goal } from "./goal";

export const project = {
  name: "Projects",
  singular: "Project",
  icon: "folder-git-2",
  template:
    "\ndate: {{date}}\nstatus: draft\n---\n",
  
  list: {
    columns: [{ type: "title", prop: "show" }],
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
  createAnythingOn: { types: ['task', 'log', 'idea', 'fact', 'document', 'link', 'article', 'book']},
  links: [
    {
      type: "backlinks",
      key: "log",
      config: {
        title: "Logs",
        icon: "file-text",
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: "linksTo",
                    type: ["log"],
                  },
                },
              ],
            },
          ],
        },
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
        find: {
          query: [
            {
              steps: [
                {
                  in: {
                    property: "linksTo",
                    type: ["task"],
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
        visibility: "notEmpty",
        find: {
          query: [
            {
              steps: [
                {
                  notIn: {
                    property: "linksTo",
                    type: ["log", "task"],
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
