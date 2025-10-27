import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const locationConfig: CRMEntityConfig<"location"> = {
  type: "location",
  name: "Locations",
  icon: "map-pin",
  dashboard: {},
  settings: {
    template: DEFAULT_TEMPLATE,
  },
  list: {
    columns: ["cover", "show", "country", "region"],
  },
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
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "company" },
          { type: "attribute", key: "role" },
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
      key: "companies",
      desc: "Companies linked to this location",
      config: {
        targetType: "company",
        properties: ["location"],
        title: "Companies",
        icon: "building-2",
        columns: [{ type: "show" }],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
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
        columns: [{ type: "show" }],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
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
        columns: [{ type: "show" }, { type: "date", align: "right" }],
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
        icon: "utensils",
        columns: [{ type: "show" }, { type: "date", align: "right" }],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      desc: "Projects linked to this location via role",
      config: {
        targetType: "project",
        properties: ["location"],
        title: "Projects",
        icon: "folder-git-2",
        columns: [
          { type: "show" },
          { type: "attribute", key: "status" },
          { type: "date", align: "right" },
        ],
        sort: {
          strategy: "manual",
        },
      },
    },
    ...makeDefaultBacklinks(["location"]),
  ],
};

export default locationConfig;
