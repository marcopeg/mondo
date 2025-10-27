import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
location: []
---
`;

const restaurantConfig: CRMEntityConfig<"restaurant"> = {
  type: "restaurant",
  name: "Restaurants",
  icon: "utensils",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "location"],
  },
  links: makeDefaultBacklinks(["restaurant"]),
};

export default restaurantConfig;
