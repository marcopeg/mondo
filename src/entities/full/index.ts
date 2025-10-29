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
import { book } from "./book";
import { show } from "./show";
import { document } from "./document";

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
      "book",
      "show",
      "document",
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
        "book",
        "show",
        "document",
      ],
    },
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
    book,
    show,
    document,
  },
};
