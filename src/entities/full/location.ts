import { restaurant } from "./restaurant";

export const location = {
  name: "Locations",
  singular: "Location",
  icon: "map-pin",
  template: "\ndate: {{date}}\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "countryRegion" },
      { type: "locationPeople" },
    ],
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
  createAnythingOn: { key: 'location', types: ['restaurant', 'person', 'company', 'gear', 'task', 'log', 'idea', 'fact', 'document', 'link', 'article', 'book']},
  links: [
    {
      type: "backlinks",
      key: "people",
      desc: "People linked to this location",
      config: {
        targetType: "person",
        properties: ["location"],
        title: "People",
        icon: "user",
        visibility: "notEmpty",
        columns: [
          {
            type: "cover",
          },
          {
            type: "show",
          },
          {
            type: "attribute",
            key: "company",
          },
          {
            type: "attribute",
            key: "role",
          },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
      },
    },
    {
      type: "backlinks",
      key: "restaurants",
      desc: "Restaurants linked to this location",
      config: {
        targetType: "restaurant",
        properties: ["location"],
        title: "Restaurants",
        icon: restaurant.icon,
        visibility: "notEmpty",
        columns: [
          {
            type: "show",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        createEntity: {
          referenceCreate: "restaurant",
        },
      },
    },
    {
      type: "backlinks",
      key: "companies",
      desc: "Companies linked to this location",
      config: {
        targetType: "company",
        properties: ["location"],
        title: "Companies",
        icon: "building-2",
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
          referenceCreate: "company",
        },
      },
    },
    {
      type: "backlinks",
      key: "teams",
      desc: "Teams linked to this location",
      config: {
        targetType: "team",
        properties: ["location"],
        title: "Teams",
        icon: "layers",
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
      key: "gears",
      desc: "Gears linked to this location",
      config: {
        targetType: "gear",
        properties: ["location"],
        title: "Gears",
        icon: "settings",
        visibility: "notEmpty",
        columns: [
          {
            type: "show",
          },
          {
            type: "date",
            align: "right",
          },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        createEntity: {
          referenceCreate: "gear",
        },
      },
    },
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
