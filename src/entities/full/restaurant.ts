import { task } from "./task";
import { log } from "./log";
import { fact } from "./fact";
import { document } from "./document";
import { idea } from "./idea";
import { recipe } from "./recipe";
import { link } from "./link";

export const restaurant = {
  name: "Restaurants",
  singular: "Restaurant",
  icon: "utensils",
  template: "\ndate: {{date}}\nlocation: []\n---\n",
  list: {
    columns: [
      { type: "cover" },
      { type: "title", prop: "show" },
      { type: "link", prop: "location" },
    ],
  },
  frontmatter: {
    location: {
      type: "entity",
      title: "Location",
      filter: {
        type: {
          in: ["location"],
        },
      }
    },
  },
  linkAnythingOn: { types: ['company', 'team', 'role', 'person', 'project', 'link', 'article', 'document', 'fact', 'idea', 'log', 'task']},
} as const;
