import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
category: []
cookTime:
calories:
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
  links: makeDefaultBacklinks(["recipe"]),
};

export default recipeConfig;
