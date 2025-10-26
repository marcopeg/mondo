import type { CRMEntityBacklinksLink } from "@/types/CRMEntityConfig";

export const DEFAULT_BACKLINKS: CRMEntityBacklinksLink[] = [
  {
    type: "backlinks",
    targetType: "fact",
    properties: ["tool"],
    title: "Facts",
    icon: "file-text",
    sort: {
      strategy: "manual",
    },
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
    sort: {
      strategy: "manual",
    },
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
    sort: {
      strategy: "manual",
    },
  },
];
