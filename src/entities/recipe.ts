import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: recipe
source:
servings:
prep_time:
cook_time:
---

## Ingredients

- 

## Instructions

1. 

`;

const recipeConfig: CRMEntityConfig<"recipe"> = {
  type: "recipe",
  name: "Cooking Book",
  icon: "book-open-check",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "source", "servings"],
  },
};

export default recipeConfig;
