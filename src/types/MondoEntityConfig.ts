// Settings wrapper has been removed from the config schema.
// Template is now a top-level property on the entity config.

export type MondoEntityListSortDirection = "asc" | "desc";

export interface MondoEntityListSortConfig {
  column?: string;
  direction?: MondoEntityListSortDirection;
}

export interface MondoEntityListConfig {
  columns?: string[];
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

export interface MondoEntityRelatedCreateConfig {
  title?: string;
  attributes?: MondoEntityCreateAttributes;
  linkProperties?: string | string[];
  openAfterCreate?: boolean;
}

export interface MondoEntityRelatedConfig {
  key?: string;
  panelKey?: string;
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
  icon: string;
  template: string;
  list?: MondoEntityListConfig;
  links?: TLink[];
  createRelated?: MondoEntityRelatedConfig[];
}

