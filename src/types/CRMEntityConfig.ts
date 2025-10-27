export interface CRMEntityDashboardConfig {
  // Dashboard config is intentionally empty
}

export interface CRMEntitySettingsConfig {
  entity?: Record<string, never>;
  template: string;
}

export type CRMEntityListSortDirection = "asc" | "desc";

export interface CRMEntityListSortConfig {
  column?: string;
  direction?: CRMEntityListSortDirection;
}

export interface CRMEntityListConfig {
  columns?: string[];
  sort?: CRMEntityListSortConfig;
}

export interface CRMEntityLinkConfig<TType extends string = string> {
  type: TType;
  collapsed?: boolean;
  [key: string]: unknown;
}

/**
 * Backlinks panel config — make this available as a built-in/default link shape
 * so individual entity declarations don't need to repeat the whole shape.
 */
export interface CRMEntityBacklinksLinkConfig {
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
    attributes?: Record<string, string | number | boolean>;
  };
  find?: {
    query: Array<{
      description?: string;
      steps: Array<
        | { out: { property: string | string[]; type?: string | string[] } }
        | { in: { property: string | string[]; type?: string | string[] } }
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

export interface CRMEntityBacklinksLink
  extends CRMEntityLinkConfig<"backlinks"> {
  key?: string;
  desc?: string;
  config?: CRMEntityBacklinksLinkConfig;
}

export interface CRMEntityBacklinksLinkLegacy
  extends CRMEntityLinkConfig<"backlinks">,
    CRMEntityBacklinksLinkConfig {}

export interface CRMEntityConfig<
  TType extends string = string,
  /**
   * TLink is the link config shape for this entity. By default we include the
   * generic CRMEntityLinkConfig plus the built-in CRMEntityBacklinksLink so
   * entities don't need to re-declare the backlinks shape every time.
   */
  TLink extends CRMEntityLinkConfig =
    | CRMEntityLinkConfig
    | CRMEntityBacklinksLink
    | CRMEntityBacklinksLinkLegacy
> {
  type: TType;
  name: string;
  icon: string;
  dashboard: CRMEntityDashboardConfig;
  settings: CRMEntitySettingsConfig;
  aliases?: string[];
  list?: CRMEntityListConfig;
  links?: TLink[];
}
