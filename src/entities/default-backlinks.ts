import type { CRMEntityBacklinksLink } from "@/types/CRMEntityConfig";

export const DEFAULT_BACKLINKS: CRMEntityBacklinksLink[] = [
  {
    type: "backlinks",
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
    desc: "Documents that reference this entity",
    config: {
      targetType: "document",
      properties: ["reference"],
      title: "Documents",
      icon: "file-text",
      sort: {
        strategy: "manual",
      },
    },
  },
  {
    type: "backlinks",
    desc: "Tasks that reference this entity",
    config: {
      targetType: "task",
      properties: ["reference"],
      title: "Tasks1",
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
