import company from "./company";
import gear from "./gear";
import tool from "./tool";
import recipe from "./recipe";
import book from "./book";
import show from "./show";
import location from "./location";
import meeting from "./meeting";
import person from "./person";
import project from "./project";
import idea from "./idea";
import role from "./role";
import team from "./team";
import restaurant from "./restaurant";
import task from "./task";
import fact from "./fact";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const ENTITIES = [
  person,
  fact,
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
] as const;

type EntityConfig = (typeof ENTITIES)[number];

export type CRMEntityType = EntityConfig["type"];

const buildEntityRecord = () =>
  ENTITIES.reduce<Record<CRMEntityType, EntityConfig>>((acc, entity) => {
    acc[entity.type] = entity;
    return acc;
  }, {} as Record<CRMEntityType, EntityConfig>);

export const CRM_ENTITIES = buildEntityRecord();

export const CRM_ENTITY_TYPES = ENTITIES.map(
  (entity) => entity.type
) as CRMEntityType[];

export const CRM_ENTITY_TYPE_SET = new Set(CRM_ENTITY_TYPES);

export const isCRMEntityType = (value: string): value is CRMEntityType =>
  CRM_ENTITY_TYPE_SET.has(value as CRMEntityType);

export const resolveCRMEntityType = (value: string): CRMEntityType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (isCRMEntityType(normalized)) {
    return normalized;
  }

  for (const entity of ENTITIES) {
    if (!entity.aliases) continue;
    if (entity.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return entity.type;
    }
  }

  return null;
};

export type { CRMEntityConfig };
export { ENTITIES as CRM_ENTITY_CONFIG_LIST };
