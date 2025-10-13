export interface CRMEntityDashboardConfig {
  helper: string;
  placeholder?: string;
}

export interface CRMEntitySettingsConfig {
  entity: {
    helper: string;
  };
  template: {
    helper: string;
    default: string;
  };
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

export interface CRMEntityConfig<
  TType extends string = string,
  TLink extends CRMEntityLinkConfig = CRMEntityLinkConfig
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
