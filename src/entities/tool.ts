import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
category:
location: []
owner:
---
`;

const toolConfig: CRMEntityConfig<
  "tool",
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
  | {
      type: "backlinks";
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
  type: "tool",
  name: "Tools",
  icon: "hammer",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["cover", "show", "category", "owner", "location"],
  },
  links: [
    {
      type: "backlinks",
      targetType: "fact",
      properties: ["tool"],
      title: "Facts",
      icon: "file-text",
    },
    {
      type: "backlinks",
      targetType: "log",
      properties: ["tool"],
      title: "Logs",
      icon: "clipboard-list",
    },
    {
      type: "backlinks",
      targetType: "document",
      properties: ["tool"],
      title: "Documents",
      icon: "file-text",
    },
    {
      type: "backlinks",
      targetType: "task",
      properties: ["tool"],
      title: "Tasks",
      icon: "check-square",
    },
  ],
};

export default toolConfig;
