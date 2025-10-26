import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
category:
location: []
owner:
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
      visibility: "always",
      createEntity: {
        enabled: true,
        title: "Add Fact",
      },
    },
    {
      type: "backlinks",
      targetType: "log",
      properties: ["tool"],
      title: "Logs",
      icon: "clipboard-list",
      visibility: "always",
    },
    {
      type: "backlinks",
      targetType: "document",
      properties: ["tool"],
      title: "Documents",
      icon: "file-text",
      visibility: "always",
    },
    {
      type: "backlinks",
      targetType: "task",
      properties: ["tool"],
      title: "Tasks",
      icon: "check-square",
      visibility: "always",
    },
  ],
};

export default toolConfig;
