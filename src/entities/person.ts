import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
location: []
company: []
role: []
team: []
---
`;

const personConfig: CRMEntityConfig<
  "person",
  | { type: "participant-tasks"; collapsed?: boolean }
  | { type: "teammates"; collapsed?: boolean }
  | { type: "meetings"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
  | {
      type: "backlinks";
      collapsed?: boolean;
      targetType?: string;
      targetKey?: string;
      target?: string; // legacy
      properties?: string | string[];
      prop?: string | string[]; // legacy alias
      title?: string;
      subtitle?: string;
      icon?: string;
      visibility?: "always" | "notEmpty";
      pageSize?: number;
      columns?: Array<
        | { type: "cover"; mode?: "cover" | "contain" }
        | { type: "show"; label?: string }
        | { type: "date"; label?: string }
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
    }
> = {
  type: "person",
  name: "People",
  icon: "user",
  aliases: ["people"],
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "company", "role", "team", "location"],
    sort: { column: "show", direction: "asc" },
  },
  links: [
    {
      type: "documents",
    },
    {
      type: "facts",
    },
    {
      type: "logs",
    },
    {
      type: "meetings",
    },
    {
      type: "participant-tasks",
    },
    {
      type: "projects",
    },
    {
      type: "teammates",
    },
    {
      type: "backlinks",
      targetType: "person",
      properties: ["reportsTo"],
      title: "Reports",
      icon: "arrow-up-circle",
      visibility: "notEmpty",
    },
  ],
};

export default personConfig;
