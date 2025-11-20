// Settings wrapper has been removed from the config schema.
// Template is now a top-level property on the entity config.

export type MondoEntityListSortDirection = "asc" | "desc";

export interface MondoEntityListSortConfig {
  column?: string;
  direction?: MondoEntityListSortDirection;
}

export type MondoEntityListColumnBase = {
  key?: string;
  label?: string;
};

export type MondoEntityListValueColumn = MondoEntityListColumnBase & {
  type: "value";
  prop: string;
};

export type MondoEntityListLinkColumn = MondoEntityListColumnBase & {
  type: "link";
  prop: string;
  mode?: "inline" | "bullet";
};

export type MondoEntityListCoverColumn = MondoEntityListColumnBase & {
  type: "cover";
  prop?: string;
};

export type MondoEntityListTitleColumn = MondoEntityListColumnBase & {
  type: "title";
  prop?: string;
};

export type MondoEntityListDateColumn = MondoEntityListColumnBase & {
  type: "date";
  prop?: string;
  linkToNote?: boolean;
};

export type MondoEntityListCompanyAreaColumn = MondoEntityListColumnBase & {
  type: "companyArea";
  companyProp?: string;
  areaProp?: string;
};

export type MondoEntityListCountryRegionColumn = MondoEntityListColumnBase & {
  type: "countryRegion";
  countryProp?: string;
  regionProp?: string;
};

export type MondoEntityListMembersColumn = MondoEntityListColumnBase & {
  type: "members";
  prop?: string;
};

export type MondoEntityListLocationPeopleColumn = MondoEntityListColumnBase & {
  type: "locationPeople";
  prop?: string;
};

export type MondoEntityListUrlColumn = MondoEntityListColumnBase & {
  type: "url";
  prop?: string;
};

export type MondoEntityListColumnDefinition =
  | MondoEntityListValueColumn
  | MondoEntityListLinkColumn
  | MondoEntityListCoverColumn
  | MondoEntityListTitleColumn
  | MondoEntityListDateColumn
  | MondoEntityListCompanyAreaColumn
  | MondoEntityListCountryRegionColumn
  | MondoEntityListMembersColumn
  | MondoEntityListLocationPeopleColumn
  | MondoEntityListUrlColumn;

export interface MondoEntityListConfig {
  columns?: MondoEntityListColumnDefinition[];
  sort?: MondoEntityListSortConfig;
}

export type MondoEntityCreateAttributeValue =
  | string
  | number
  | boolean
  | MondoEntityCreateAttributeValue[]
  | Record<string, unknown>;

export type MondoEntityCreateAttributes = Record<
  string,
  MondoEntityCreateAttributeValue
>;

/**
 * Frontmatter field configuration for entity properties.
 * Enables dynamic frontmatter fields that can be added via UI.
 */
export interface MondoEntityFrontmatterFieldConfig {
  /** Field type */
  type: "entity" | "datetime" | "text" | "number" | "boolean";
  /** Display title for the field */
  title?: string;
  /** 
   * Target property key in frontmatter. If not specified, uses the config key.
   * Allows multiple frontmatter configs to populate the same property.
   */
  key?: string;
  /** Optional icon to display in the UI */
  icon?: string;
  /** Whether to allow multiple values (applies to entity type) */
  multiple?: boolean;
  /** Default value or preset function (e.g., "now" for datetime) */
  default?: string | number | boolean;
  /** Filter configuration for entity selection (same as backlinks panel filter) */
  filter?: Record<string, unknown> | { all?: unknown[]; any?: unknown[]; not?: unknown };
  /** Find configuration for entity selection (same as backlinks panel find) */
  find?: {
    query: Array<{
      description?: string;
      steps: Array<
        | { out: { property: string | string[]; type?: string | string[] } }
        | { in: { property: string | string[]; type?: string | string[] } }
        | { notIn: { property: string | string[]; type?: string | string[] } }
        | { filter: { type?: string | string[] } }
        | { dedupe?: true }
        | { unique?: true }
        | { not?: "host" }
      >;
    }>;
    combine?: "union" | "intersect" | "subtract";
  };
}

export type MondoEntityFrontmatterConfig = Record<string, MondoEntityFrontmatterFieldConfig>;

export interface MondoEntityRelatedCreateConfig {
  title?: string;
  attributes?: MondoEntityCreateAttributes;
  linkProperties?: string | string[];
  openAfterCreate?: boolean;
}

export interface MondoEntityRelatedConfig {
  key?: string;
  panelKey?: string;
  /**
   * Optional: reference a backlinks panel by its key to inherit defaults
   * (alias of panelKey). Useful in JSON configs for clarity.
   */
  referenceLink?: string;
  targetType?: string;
  label?: string;
  icon?: string;
  create?: MondoEntityRelatedCreateConfig;
}

export interface MondoEntityLinkConfig<TType extends string = string> {
  type: TType;
  collapsed?: boolean;
  [key: string]: unknown;
}

/**
 * Backlinks panel config — make this available as a built-in/default link shape
 * so individual entity declarations don't need to repeat the whole shape.
 */
export interface MondoEntityBacklinksLinkConfig {
  collapsed?: boolean;
  targetType?: string;
  targetKey?: string;
  target?: string;
  properties?: string | string[];
  prop?: string | string[];
  title?: string;
  subtitle?: string;
  icon?: string;
  visibility?: "always" | "notEmpty";
  pageSize?: number;
  columns?: Array<
    | {
        type: "cover";
        mode?: "cover" | "contain";
        align?: "left" | "right" | "center";
      }
    | { type: "entityIcon"; align?: "left" | "right" | "center" }
    | { type: "show"; label?: string; align?: "left" | "right" | "center" }
    | { type: "date"; label?: string; align?: "left" | "right" | "center" }
    | {
        type: "attribute";
        key: string;
        label?: string;
        align?: "left" | "right" | "center";
      }
  >;
  sort?:
    | { strategy: "manual" }
    | {
        strategy: "column";
        column: "show" | "date";
        direction?: "asc" | "desc";
      };
  createEntity?: {
    enabled?: boolean;
    title?: string;
    attributes?: MondoEntityCreateAttributes;
    /**
     * Optional: reference a createRelated entry by key to inherit its
     * creation settings (title/attributes/openAfterCreate/linkProperties).
     * Panel-level values override referenced ones.
     */
    referenceCreate?: string;
  };
  badge?: {
    enabled?: boolean;
    content?: string;
  };
  find?: {
    query: Array<{
      description?: string;
      steps: Array<
        | { out: { property: string | string[]; type?: string | string[] } }
        | { in: { property: string | string[]; type?: string | string[] } }
        | { notIn: { property: string | string[]; type?: string | string[] } }
        | { filter: { type?: string | string[] } }
        | { dedupe?: true }
        | { unique?: true }
        | { not?: "host" }
      >;
    }>;
    combine?: "union" | "intersect" | "subtract";
  };
  filter?:
    | Record<string, unknown>
    | { all?: unknown[]; any?: unknown[]; not?: unknown };
}

export interface MondoEntityBacklinksLink
  extends MondoEntityLinkConfig<"backlinks"> {
  key?: string;
  desc?: string;
  config?: MondoEntityBacklinksLinkConfig;
}

export interface MondoEntityBacklinksLinkLegacy
  extends MondoEntityLinkConfig<"backlinks">,
    MondoEntityBacklinksLinkConfig {}

export interface MondoEntityConfig<
  TType extends string = string,
  /**
   * TLink is the link config shape for this entity. By default we include the
   * generic MondoEntityLinkConfig plus the built-in MondoEntityBacklinksLink so
   * entities don't need to re-declare the backlinks shape every time.
   */
  TLink extends MondoEntityLinkConfig =
    | MondoEntityLinkConfig
    | MondoEntityBacklinksLink
    | MondoEntityBacklinksLinkLegacy
> {
  type: TType;
  name: string;
  /** Optional singular form of the entity name (e.g., name: "Projects" -> singular: "Project"). */
  singular?: string;
  icon: string;
  template: string;
  list?: MondoEntityListConfig;
  links?: TLink[];
  createRelated?: MondoEntityRelatedConfig[];
  /** Optional frontmatter field configurations for dynamic property addition */
  frontmatter?: MondoEntityFrontmatterConfig;
  /**
   * Optional: automatically add frontmatter entries for all entity types not explicitly
   * defined in frontmatter config. Can be a string (property key to populate) or boolean
   * (true defaults to "linksTo", false disables the feature).
   */
  linkAnythingOn?: string | boolean;
  /**
   * Optional: automatically add createRelated entries for all entity types not explicitly
   * defined in createRelated config. Can be a string (property key to populate) or boolean
   * (true defaults to "linksTo", false disables the feature).
   */
  createAnythingOn?: string | boolean;
}
