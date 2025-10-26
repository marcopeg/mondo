import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
---
`;

const toolConfig: CRMEntityConfig<"tool"> = {
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
      columns: [
        { type: "show" },
        { type: "attribute", key: "status" },
        { type: "date", align: "right" },
      ],
    },
  ],
};

export default toolConfig;
