import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { restaurant } from "./restaurant";
import { team } from "./team";
import { company } from "./company";
import { gear } from "./gear";

export const location = {
  name: "Locations",
  icon: "map-pin",
  template: "---\ntype: {{type}}\ndate: {{date}}\n---\n",
  list: {
    columns: ["cover", "show", "country", "region"],
  },
  createRelated: [
    {
      key: "restaurant",
      label: "Restaurant",
      icon: restaurant.icon,
      create: {
        title: "New Restaurant for {@this.show}",
        attributes: {
          type: "restaurant",
          location: ["{@this}"],
        },
      },
    },
    {
      key: "person",
      label: "Person",
      icon: "user",
      create: {
        title: "New Person for {@this.show}",
        attributes: {
          type: "person",
          location: ["{@this}"],
        },
      },
    },
    {
      key: "gear",
      label: "Gear",
      icon: gear.icon,
      create: {
        title: "New Gear for {@this.show}",
        attributes: {
          type: "gear",
          location: ["{@this}"],
        },
      },
    },
    {
      key: "company",
      label: "Company",
      icon: company.icon,
      create: {
        title: "New Company for {@this.show}",
        attributes: {
          type: "company",
          location: ["{@this}"],
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
          location: ["{@this}"],
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
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      create: {
        title: "New Fact for {@this.show}",
        attributes: {
          type: "fact",
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
      key: "idea",
      label: "Idea",
      icon: idea.icon,
      create: {
        title: "New Idea for {@this.show}",
        attributes: {
          type: "idea",
          linksTo: ["{@this}"],
        },
      },
    },
  ],
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
      key: "tasks",
      config: {
        targetType: "task",
        properties: ["linksTo"],
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
      key: "links",
      config: {
        title: "Links",
        icon: "layers",
        visibility: "notEmpty",
        find: {
          query: [
            {
              description: "Notes referencing this location",
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
          { type: "attribute", key: "type", label: "Type" },
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
