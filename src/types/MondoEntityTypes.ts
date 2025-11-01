export interface MondoConfig {
  titles?: {
    order?: string[];
  };
  relevantNotes?: {
    filter?: {
      order?: string[];
    };
  };
  quickSearch?: {
    entities?: string[];
  };
  entities: Record<string, Record<string, unknown>>;
}

export type MondoEntityConfigRecord = MondoConfig["entities"];
export type MondoEntityType = string;
