import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
location:
---

# Notes

`;

const restaurantConfig: CRMEntityConfig<"restaurant"> = {
  type: "restaurant",
  name: "Restaurants",
  icon: "utensils",
  dashboard: {
    helper: "Open or create a new Restaurant",
    placeholder: "Search restaurants...",
  },
  settings: {
    entity: {
      helper: "type=restaurant",
    },
    template: {
      helper: "Template for new restaurant notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "location"],
  },
};

export default restaurantConfig;
