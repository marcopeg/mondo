import {
  CRM_ENTITIES,
  CRM_ENTITY_TYPE_SET,
  CRM_ENTITY_TYPES,
  type CRMEntityType,
} from "@/entities";

export type CRMFileType = CRMEntityType;

type UppercaseType<T extends string> = Uppercase<T>;

type CRMFileTypeConst = {
  [K in CRMFileType as UppercaseType<K>]: CRMFileType;
};

export const CRMFileType = Object.freeze(
  CRM_ENTITY_TYPES.reduce((acc, type) => {
    const key = type.toUpperCase() as UppercaseType<typeof type>;
    (acc as Record<string, CRMFileType>)[key] = type;
    return acc;
  }, {} as Record<string, CRMFileType>)
) as CRMFileTypeConst;

export const CRM_FILE_TYPES = [...CRM_ENTITY_TYPES];

export const CRM_FILE_TYPE_LOOKUP = CRM_ENTITY_TYPE_SET;

export const isCRMFileType = (type: string): type is CRMFileType =>
  CRM_FILE_TYPE_LOOKUP.has(type as CRMFileType);

export const getCRMEntityConfig = (type: CRMFileType) => CRM_ENTITIES[type];
