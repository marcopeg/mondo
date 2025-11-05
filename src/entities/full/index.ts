import { person } from "./person";
import { fact } from "./fact";
import { log } from "./log";
import { task } from "./task";
import { project } from "./project";
import { idea } from "./idea";
import { company } from "./company";
import { team } from "./team";
import { meeting } from "./meeting";
import { role } from "./role";
import { location } from "./location";
import { restaurant } from "./restaurant";
import { gear } from "./gear";
import { tool } from "./tool";
import { recipe } from "./recipe";
import { ingredient } from "./ingredient";
import { book } from "./book";
import { show } from "./show";
import { newsletter } from "./newsletter";
import { document } from "./document";
import { article } from "./article";
import { link } from "./link";

export const mondoConfigFull = {
  titles: {
    order: [
      "person",
      "fact",
      "log",
      "task",
      "project",
      "idea",
      "company",
      "team",
      "meeting",
      "role",
      "location",
      "restaurant",
      "gear",
      "tool",
      "recipe",
      "ingredient",
      "book",
      "show",
      "newsletter",
      "document",
      "article",
      "link",
    ],
  },
  relevantNotes: {
    filter: {
      order: [
        "person",
        "fact",
        "log",
        "task",
        "project",
        "idea",
        "company",
        "team",
        "meeting",
        "role",
        "location",
        "restaurant",
        "gear",
        "tool",
        "recipe",
        "ingredient",
        "book",
        "show",
        "newsletter",
        "document",
        "article",
        "link",
      ],
    },
  },
  quickSearch: {
    entities: ["person", "company", "location", "role", "task"],
  },
  entities: {
    person,
    fact,
    log,
    task,
    project,
    idea,
    company,
    team,
    meeting,
    role,
    location,
    restaurant,
    gear,
    tool,
    recipe,
    ingredient,
    book,
    show,
    newsletter,
    document,
    article,
    link,
  },
};
