import crmConfig from "@/crm-config.json";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import type {
  CRMEntityType,
  CRMEntityConfigRecord,
} from "@/types/CRMEntityTypes";

const CRM_ENTITY_CONFIG_ENTRIES = Object.entries(crmConfig.entities) as Array<
  [CRMEntityType, CRMEntityConfigRecord[CRMEntityType]]
>;

// Enrich entity configs with a computed `type` derived from the record key
export const CRM_ENTITY_CONFIG_LIST = CRM_ENTITY_CONFIG_ENTRIES.map(
  ([type, config]) => ({ ...(config as object), type } as CRMEntityConfig)
);

export const CRM_ENTITIES = Object.fromEntries(
  CRM_ENTITY_CONFIG_ENTRIES.map(([type, config]) => [
    type,
    { ...(config as object), type } as CRMEntityConfig,
  ])
) as Record<CRMEntityType, CRMEntityConfig>;

export const CRM_ENTITY_TYPES = CRM_ENTITY_CONFIG_ENTRIES.map(
  ([type]) => type
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
export type { CRMEntityType } from "@/types/CRMEntityTypes";
