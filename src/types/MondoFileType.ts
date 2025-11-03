import {
  MONDO_ENTITIES,
  MONDO_ENTITY_TYPE_SET,
  MONDO_ENTITY_TYPES,
  onMondoConfigChange,
  type MondoEntityType,
} from "@/entities";

export const DAILY_NOTE_TYPE = "daily" as const;
export const LEGACY_DAILY_NOTE_TYPE = "log" as const;
export const JOURNAL_TYPE = "journal" as const;

const SPECIAL_MONDO_TYPES = [
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
  JOURNAL_TYPE,
] as const;

/**
 * Special built-in types that are not entities but have special handling
 */
export type SpecialMondoType = (typeof SPECIAL_MONDO_TYPES)[number];

/**
 * All Mondo-recognized file types (entities + special types)
 */
export type MondoFileType = MondoEntityType | SpecialMondoType;

type UppercaseType<T extends string> = Uppercase<T>;

type MondoFileTypeConst = Record<string, MondoEntityType>;

const buildFileTypeMapping = () => {
  const mapping = MONDO_ENTITY_TYPES.reduce((acc, type) => {
    const key = type.toUpperCase() as UppercaseType<typeof type>;
    acc[key] = type;
    return acc;
  }, {} as Record<string, MondoEntityType>);

  const list: MondoFileType[] = [
    ...MONDO_ENTITY_TYPES,
    ...SPECIAL_MONDO_TYPES.filter(
      (type) => !MONDO_ENTITY_TYPE_SET.has(type as MondoEntityType)
    ),
  ];

  return {
    mapping: Object.freeze(mapping) as MondoFileTypeConst,
    list,
  };
};

const initialMapping = buildFileTypeMapping();

export let MondoFileType: MondoFileTypeConst = initialMapping.mapping;

export let MONDO_FILE_TYPES: MondoFileType[] = initialMapping.list;

export let MONDO_FILE_TYPE_LOOKUP = MONDO_ENTITY_TYPE_SET;

const refreshFileTypeMapping = () => {
  const { mapping, list } = buildFileTypeMapping();
  MondoFileType = mapping;
  MONDO_FILE_TYPES = list;
  MONDO_FILE_TYPE_LOOKUP = MONDO_ENTITY_TYPE_SET;
};

refreshFileTypeMapping();

onMondoConfigChange(refreshFileTypeMapping);
const SPECIAL_MONDO_TYPE_SET = new Set<SpecialMondoType>(SPECIAL_MONDO_TYPES);

export type DailyNoteType = typeof DAILY_NOTE_TYPE | typeof LEGACY_DAILY_NOTE_TYPE;

const DAILY_NOTE_TYPE_SET = new Set<DailyNoteType>([
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
]);

/**
 * Check if a type is a Mondo entity type (excludes special types like daily notes or journals)
 */
export const isMondoEntityType = (type: string): type is MondoEntityType =>
  MONDO_FILE_TYPE_LOOKUP.has(type as MondoEntityType);

/**
 * Check if a type is a special Mondo type (daily notes, legacy logs, journal, etc.)
 */
export const isSpecialMondoType = (type: string): type is SpecialMondoType =>
  SPECIAL_MONDO_TYPE_SET.has(type as SpecialMondoType);

export const isDailyNoteType = (
  type: string | null | undefined
): type is DailyNoteType =>
  typeof type === "string" && DAILY_NOTE_TYPE_SET.has(type as DailyNoteType);

export const isJournalType = (
  type: string | null | undefined
): type is typeof JOURNAL_TYPE =>
  typeof type === "string" && type.trim().toLowerCase() === JOURNAL_TYPE;

/**
 * Check if a type is any recognized Mondo type (entity or special)
 */
export const isMondoFileType = (type: string): type is MondoFileType =>
  isMondoEntityType(type) || isSpecialMondoType(type);

export const getMondoEntityConfig = (type: MondoFileType) => {
  if (isMondoEntityType(type)) {
    return MONDO_ENTITIES[type];
  }
  return undefined;
};
