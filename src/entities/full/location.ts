import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { restaurant } from "./restaurant";
import { team } from "./team";
import { company } from "./company";
import { gear } from "./gear";
import { link } from "./link";

export const location = {
  name: "Locations",
  singular: "Location",
  icon: "map-pin",
  template: "---\ntype: {{type}}\ndate: {{date}}\n---\n",
  list: {
    columns: ["cover", "show", "country_region", "people"],
  },
  createRelated: [
    {
      key: "restaurant",
      label: "Restaurant",
      icon: restaurant.icon,
      targetType: "restaurant",
      create: {
        title: "New Restaurant for {@this.show}",
        attributes: {
          location: ["{@this}"],
        },
      },
    },
    {
      key: "person",
      label: "Person",
      icon: "user",
      targetType: "person",
      create: {
        title: "New Person for {@this.show}",
        attributes: {
          location: ["{@this}"],
        },
      },
    },
    {
      key: "gear",
      label: "Gear",
      icon: gear.icon,
      targetType: "gear",
      create: {
        title: "New Gear for {@this.show}",
        attributes: {
          location: ["{@this}"],
        },
      },
    },
    {
      key: "company",
      label: "Company",
      icon: company.icon,
      targetType: "company",
      create: {
        title: "New Company for {@this.show}",
        attributes: {
          location: ["{@this}"],
        },
      },
    },
    {
      key: "team",
      label: "Team",
      icon: team.icon,
      targetType: "team",
      create: {
        title: "New Team for {@this.show}",
        attributes: {
          location: ["{@this}"],
        },
      },
    },
    {
      key: "task",
      label: "Task",
      icon: task.icon,
      targetType: "task",
      create: {
        title: "New Task for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "log",
      label: "Log",
      icon: log.icon,
      targetType: "log",
      create: {
        title: "{YY}-{MM}-{DD} {hh}.{mm} Log for {@this.show}",
        attributes: {
          linksTo: ["{@this}"],
        },
      },
    },
    {
      key: "fact",
      label: "Fact",
      icon: fact.icon,
      targetType: "fact",
      create: {
        title: "New Fact for {@this.show}",
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
      icon: idea.icon,
      targetType: "idea",
      create: {
        title: "New Idea for {@this.show}",
        attributes: {
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
    {
      type: "backlinks",
      key: "linked_links",
      config: {
        targetType: "link",
        properties: ["location"],
        title: link.name,
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
  ],
} as const;
