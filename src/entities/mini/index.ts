import { person } from "./person";
import { company } from "./company";
import { task } from "./task";

export const mondoConfigMini = {
  quickSearch: {
    entities: ["person", "company", "task"],
  },
  entities: {
    person,
    company,
    task,
  },
};
