import crmConfig from "@/crm-config.full.json";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import type { CRMEntityType, CRMConfig } from "@/types/CRMEntityTypes";

const cloneConfig = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type CRMConfigListener = (config: CRMConfig) => void;

type CRMEntityState = {
  list: CRMEntityConfig[];
  entities: Record<CRMEntityType, CRMEntityConfig>;
  types: CRMEntityType[];
  typeSet: Set<CRMEntityType>;
  ui: {
    tiles: { order: CRMEntityType[] };
    relevantNotes: { filter: { order: CRMEntityType[] } };
  };
};

const buildState = (config: CRMConfig): CRMEntityState => {
  const entries = Object.entries(config.entities) as Array<
    [CRMEntityType, Record<string, unknown>]
  >;

  const list = entries.map(([type, entityConfig]) => {
    const normalizedConfig = entityConfig as Record<string, unknown>;
    return { ...(normalizedConfig as object), type } as CRMEntityConfig;
  });

  const entities = Object.fromEntries(
    list.map((entityConfig) => [entityConfig.type, entityConfig])
  ) as Record<CRMEntityType, CRMEntityConfig>;

  const types = list.map(
    (entityConfig) => entityConfig.type
  ) as CRMEntityType[];
  const typeSet = new Set(types);

  const titlesOrder = Array.isArray(config.titles?.order)
    ? (config.titles?.order as CRMEntityType[])
    : types;
  const relevantOrder = Array.isArray(config.relevantNotes?.filter?.order)
    ? (config.relevantNotes?.filter?.order as CRMEntityType[])
    : types;

  const ui = {
    tiles: {
      order: titlesOrder,
    },
    relevantNotes: {
      filter: {
        order: relevantOrder,
      },
    },
  } as const;

  return {
    list,
    entities,
    types,
    typeSet,
    ui,
  };
};

let currentConfig = cloneConfig(crmConfig) as CRMConfig;
let currentState = buildState(currentConfig);

export let CRM_ENTITY_CONFIG_LIST = currentState.list;

export let CRM_ENTITIES = currentState.entities;

export let CRM_ENTITY_TYPES = currentState.types;

export let CRM_ENTITY_TYPE_SET = currentState.typeSet;

// UI configuration: controls ordering for tiles and relevant notes filters
export let CRM_UI_CONFIG = currentState.ui;

const listeners = new Set<CRMConfigListener>();

export const getCRMConfig = (): CRMConfig => currentConfig;

export const setCRMConfig = (nextConfig: CRMConfig) => {
  currentConfig = cloneConfig(nextConfig);
  currentState = buildState(currentConfig);

  CRM_ENTITY_CONFIG_LIST = currentState.list;
  CRM_ENTITIES = currentState.entities;
  CRM_ENTITY_TYPES = currentState.types;
  CRM_ENTITY_TYPE_SET = currentState.typeSet;
  CRM_UI_CONFIG = currentState.ui;

  console.log(
    `CRM: setCRMConfig applied with ${CRM_ENTITY_TYPES.length} entity types`
  );

  listeners.forEach((listener) => {
    try {
      listener(currentConfig);
    } catch (error) {
      console.error("CRM: config listener failed", error);
    }
  });
};

export const onCRMConfigChange = (listener: CRMConfigListener) => {
  listeners.add(listener);
  try {
    listener(currentConfig);
  } catch (error) {
    console.error("CRM: config listener failed during registration", error);
  }
  return () => {
    listeners.delete(listener);
  };
};

export const isCRMEntityType = (value: string): value is CRMEntityType =>
  CRM_ENTITY_TYPE_SET.has(value as CRMEntityType);

export const resolveCRMEntityType = (value: string): CRMEntityType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (isCRMEntityType(normalized)) {
    return normalized;
  }
  return null;
};

export type { CRMEntityConfig };
export type { CRMEntityType } from "@/types/CRMEntityTypes";
