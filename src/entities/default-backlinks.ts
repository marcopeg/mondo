import type { CRMEntityBacklinksLink } from "@/types/CRMEntityConfig";

export const DEFAULT_BACKLINKS: CRMEntityBacklinksLink[] = [
  {
    type: "backlinks",
    targetType: "fact",
    properties: ["reference"],
    title: "Facts",
    icon: "file-text",
    sort: {
      strategy: "manual",
    },
  },
  {
    type: "backlinks",
    targetType: "log",
    properties: ["reference"],
    title: "Logs",
    icon: "clipboard-list",
  },
  {
    type: "backlinks",
    targetType: "document",
    properties: ["reference"],
    title: "Documents",
    icon: "file-text",
    sort: {
      strategy: "manual",
    },
  },
  {
    type: "backlinks",
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
];
