import {
  CRM_ENTITIES,
  CRM_ENTITY_TYPE_SET,
  CRM_ENTITY_TYPES,
  type CRMEntityType,
} from "@/entities";

export const DAILY_NOTE_TYPE = "daily" as const;
export const LEGACY_DAILY_NOTE_TYPE = "log" as const;

const SPECIAL_CRM_TYPES = [
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
  "journal",
] as const;

/**
 * Special built-in types that are not entities but have special handling
 */
export type SpecialCRMType = (typeof SPECIAL_CRM_TYPES)[number];

/**
 * All CRM-recognized file types (entities + special types)
 */
export type CRMFileType = CRMEntityType | SpecialCRMType;

type UppercaseType<T extends string> = Uppercase<T>;

type CRMFileTypeConst = {
  [K in CRMEntityType as UppercaseType<K>]: CRMEntityType;
};

export const CRMFileType = Object.freeze(
  CRM_ENTITY_TYPES.reduce((acc, type) => {
    const key = type.toUpperCase() as UppercaseType<typeof type>;
    (acc as Record<string, CRMEntityType>)[key] = type;
    return acc;
  }, {} as Record<string, CRMEntityType>)
) as CRMFileTypeConst;

export const CRM_FILE_TYPES: CRMFileType[] = [
  ...CRM_ENTITY_TYPES,
  ...SPECIAL_CRM_TYPES,
];

export const CRM_FILE_TYPE_LOOKUP = CRM_ENTITY_TYPE_SET;
const SPECIAL_CRM_TYPE_SET = new Set<SpecialCRMType>(SPECIAL_CRM_TYPES);

export type DailyNoteType = typeof DAILY_NOTE_TYPE | typeof LEGACY_DAILY_NOTE_TYPE;

const DAILY_NOTE_TYPE_SET = new Set<DailyNoteType>([
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
]);

/**
 * Check if a type is a CRM entity type (excludes special types like daily notes or journals)
 */
export const isCRMEntityType = (type: string): type is CRMEntityType =>
  CRM_FILE_TYPE_LOOKUP.has(type as CRMEntityType);

/**
 * Check if a type is a special CRM type (daily notes, legacy logs, journal, etc.)
 */
export const isSpecialCRMType = (type: string): type is SpecialCRMType =>
  SPECIAL_CRM_TYPE_SET.has(type as SpecialCRMType);

export const isDailyNoteType = (
  type: string | null | undefined
): type is DailyNoteType =>
  typeof type === "string" && DAILY_NOTE_TYPE_SET.has(type as DailyNoteType);

/**
 * Check if a type is any recognized CRM type (entity or special)
 */
export const isCRMFileType = (type: string): type is CRMFileType =>
  isCRMEntityType(type) || isSpecialCRMType(type);

export const getCRMEntityConfig = (type: CRMFileType) => {
  if (isCRMEntityType(type)) {
    return CRM_ENTITIES[type];
  }
  return undefined;
};
