import crmConfig from "@/crm-config.json";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

type CRMConfig = typeof crmConfig;
type CRMEntityConfigRecord = CRMConfig["entities"];
export type CRMEntityType = Extract<keyof CRMEntityConfigRecord, string>;

const CRM_ENTITY_CONFIG_ENTRIES = Object.entries(crmConfig.entities) as Array<
  [CRMEntityType, CRMEntityConfigRecord[CRMEntityType]]
>;

export const CRM_ENTITY_CONFIG_LIST = CRM_ENTITY_CONFIG_ENTRIES.map(
  ([, config]) => config as CRMEntityConfig
);

export const CRM_ENTITIES = Object.fromEntries(
  CRM_ENTITY_CONFIG_ENTRIES
) as Record<CRMEntityType, CRMEntityConfig>;

export const CRM_ENTITY_TYPES = CRM_ENTITY_CONFIG_LIST.map(
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

  for (const entity of CRM_ENTITY_CONFIG_LIST) {
    if (!entity.aliases) continue;
    if (entity.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return entity.type as CRMEntityType;
    }
  }

  return null;
};

// UI configuration: controls ordering for tiles and relevant notes filters
export const CRM_UI_CONFIG = {
  tiles: {
    order: crmConfig.titles.order as CRMEntityType[],
  },
  relevantNotes: {
    filter: {
      order: crmConfig.relevantNotes.filter.order as CRMEntityType[],
    },
  },
} as const;

export type { CRMEntityConfig };
