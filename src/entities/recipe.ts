import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
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

const recipeConfig: CRMEntityConfig<
  "recipe",
  | { type: "documents"; collapsed?: boolean }
> = {
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
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default recipeConfig;
