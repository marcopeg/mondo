import type { CRMEntityBacklinksLink } from "@/types/CRMEntityConfig";

export const DEFAULT_BACKLINKS: CRMEntityBacklinksLink[] = [
  {
    type: "backlinks",
    key: "facts",
    config: {
      targetType: "fact",
      properties: ["link"],
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
    config: {
      targetType: "log",
      properties: ["link"],
      title: "Logs",
      icon: "clipboard-list",
    },
  },
  {
    type: "backlinks",
    key: "documents",
    config: {
      targetType: "document",
      properties: ["link"],
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
    config: {
      targetType: "task",
      properties: ["link"],
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
