import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const roleConfig: CRMEntityConfig<"role"> = {
  type: "role",
  name: "Roles",
  icon: "briefcase",
  dashboard: {},
  settings: {
    template: DEFAULT_TEMPLATE,
  },
  list: {
    columns: ["show"],
  },
  links: [
    {
      type: "backlinks",
      key: "people",
      config: {
        targetType: "person",
        properties: ["role"],
        title: "People",
        icon: "users",
        collapsed: false,
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "company" },
          { type: "attribute", key: "team" },
        ],
      },
    },
    {
      type: "backlinks",
      key: "projects",
      desc: "Projects associated with this role",
      config: {
        targetType: "project",
        properties: ["role"],
        title: "Projects",
        icon: "folder-git-2",
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
    ...DEFAULT_BACKLINKS,
  ],
};

export default roleConfig;
