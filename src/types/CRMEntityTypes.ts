export interface CRMConfig {
  titles?: {
    order?: string[];
  };
  relevantNotes?: {
    filter?: {
      order?: string[];
    };
  };
  entities: Record<string, Record<string, unknown>>;
}

export type CRMEntityConfigRecord = CRMConfig["entities"];
export type CRMEntityType = string;
