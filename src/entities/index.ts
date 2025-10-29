import mondoConfig from "@/mondo-config.json";
import { mondoConfigFull } from "./full";
import { mondoConfigMini } from "./mini";
import type { MondoEntityConfig } from "@/types/MondoEntityConfig";
import type { MondoEntityType, MondoConfig } from "@/types/MondoEntityTypes";

const cloneConfig = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type MondoConfigListener = (config: MondoConfig) => void;

type MondoEntityState = {
  list: MondoEntityConfig[];
  entities: Record<MondoEntityType, MondoEntityConfig>;
  types: MondoEntityType[];
  typeSet: Set<MondoEntityType>;
  ui: {
    tiles: { order: MondoEntityType[] };
    relevantNotes: { filter: { order: MondoEntityType[] } };
  };
};

const buildState = (config: MondoConfig): MondoEntityState => {
  const entries = Object.entries(config.entities) as Array<
    [MondoEntityType, Record<string, unknown>]
  >;

  const list = entries.map(([type, entityConfig]) => {
    const normalizedConfig = entityConfig as Record<string, unknown>;
    return { ...(normalizedConfig as object), type } as MondoEntityConfig;
  });

  const entities = Object.fromEntries(
    list.map((entityConfig) => [entityConfig.type, entityConfig])
  ) as Record<MondoEntityType, MondoEntityConfig>;

  const types = list.map(
    (entityConfig) => entityConfig.type
  ) as MondoEntityType[];
  const typeSet = new Set(types);

  const titlesOrder = Array.isArray(config.titles?.order)
    ? (config.titles?.order as MondoEntityType[])
    : types;
  const relevantOrder = Array.isArray(config.relevantNotes?.filter?.order)
    ? (config.relevantNotes?.filter?.order as MondoEntityType[])
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

let currentConfig = cloneConfig(mondoConfig) as MondoConfig;
let currentState = buildState(currentConfig);

export let MONDO_ENTITY_CONFIG_LIST = currentState.list;

export let MONDO_ENTITIES = currentState.entities;

export let MONDO_ENTITY_TYPES = currentState.types;

export let MONDO_ENTITY_TYPE_SET = currentState.typeSet;

// UI configuration: controls ordering for tiles and relevant notes filters
export let MONDO_UI_CONFIG = currentState.ui;

export type MondoConfigPreset = {
  key: string;
  description: string;
  config: MondoConfig;
};

export const MONDO_CONFIG_PRESETS: MondoConfigPreset[] = [
  {
    key: "full",
    description: "Full CRM",
    config: cloneConfig(mondoConfigFull) as MondoConfig,
  },
  {
    key: "mini",
    description: "Mini CRM",
    config: cloneConfig(mondoConfigMini) as MondoConfig,
  },
];

const listeners = new Set<MondoConfigListener>();

export const getMondoConfig = (): MondoConfig => currentConfig;

export const setMondoConfig = (nextConfig: MondoConfig) => {
  currentConfig = cloneConfig(nextConfig);
  currentState = buildState(currentConfig);

  MONDO_ENTITY_CONFIG_LIST = currentState.list;
  MONDO_ENTITIES = currentState.entities;
  MONDO_ENTITY_TYPES = currentState.types;
  MONDO_ENTITY_TYPE_SET = currentState.typeSet;
  MONDO_UI_CONFIG = currentState.ui;

  console.log(
    `Mondo: setMondoConfig applied with ${MONDO_ENTITY_TYPES.length} entity types`
  );

  listeners.forEach((listener) => {
    try {
      listener(currentConfig);
    } catch (error) {
      console.error("Mondo: config listener failed", error);
    }
  });
};

export const onMondoConfigChange = (listener: MondoConfigListener) => {
  listeners.add(listener);
  try {
    listener(currentConfig);
  } catch (error) {
    console.error("Mondo: config listener failed during registration", error);
  }
  return () => {
    listeners.delete(listener);
  };
};

export const isMondoEntityType = (value: string): value is MondoEntityType =>
  MONDO_ENTITY_TYPE_SET.has(value as MondoEntityType);

export const resolveMondoEntityType = (
  value: string
): MondoEntityType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (isMondoEntityType(normalized)) {
    return normalized;
  }
  return null;
};

export type { MondoEntityConfig };
export type { MondoEntityType } from "@/types/MondoEntityTypes";
