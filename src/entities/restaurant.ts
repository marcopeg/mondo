import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
location: []
---
`;

const restaurantConfig: CRMEntityConfig<
  "restaurant",
  | { type: "documents"; collapsed?: boolean }
> = {
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
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default restaurantConfig;
