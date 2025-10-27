import type { CRMEntityBacklinksLink } from "@/types/CRMEntityConfig";

export const DEFAULT_BACKLINKS: CRMEntityBacklinksLink[] = [
  {
    type: "backlinks",
    key: "facts",
    desc: "Facts that reference this entity",
    config: {
      targetType: "fact",
      properties: ["reference"],
      title: "Facts",
      icon: "file-text",
      sort: {
        strategy: "manual",
      },
    },
  },
  {
    type: "backlinks",
    key: "logs",
    desc: "Logs that reference this entity",
    config: {
      targetType: "log",
      properties: ["reference"],
      title: "Logs",
      icon: "clipboard-list",
    },
  },
  {
    type: "backlinks",
    key: "documents",
    desc: "Documents that reference this entity",
    config: {
      targetType: "document",
      properties: ["reference"],
      title: "Documents",
      icon: "paperclip",
      sort: {
        strategy: "manual",
      },
    },
  },
  {
    type: "backlinks",
    key: "tasks",
    desc: "Tasks that reference this entity",
    config: {
      targetType: "task",
      properties: ["reference"],
      title: "Tasks",
      icon: "check-square",
      columns: [
        { type: "show" },
        { type: "attribute", key: "status" },
        { type: "date", align: "right" },
      ],
      sort: {
        strategy: "manual",
      },
    },
  },
];
