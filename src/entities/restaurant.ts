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
    placeholder: "Search restaurants...",
  },
  settings: {
    template: {
      default: template,
    },
  },
  list: {
    columns: ["show", "location"],
  },
};

export default restaurantConfig;
