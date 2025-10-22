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
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "location"],
  },
};

export default restaurantConfig;
