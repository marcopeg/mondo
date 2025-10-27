import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
location: []
---
`;

const companyConfig: CRMEntityConfig<"company"> = {
  type: "company",
  name: "Companies",
  icon: "building-2",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "location"],
  },
  links: [
    {
      type: "backlinks",
      key: "employees",
      desc: "Employees working at this company",
      config: {
        targetType: "person",
        properties: ["company"],
        title: "Employees",
        icon: "users",
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "team" },
          { type: "attribute", key: "role" },
        ],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
      },
    },
    {
      type: "backlinks",
      key: "teams",
      desc: "Teams within this company",
      config: {
        targetType: "team",
        properties: ["company"],
        title: "Teams",
        icon: "layers",
        columns: [{ type: "show" }],
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
      },
    },
    {
      type: "backlinks",
      key: "projects",
      desc: "Projects associated with this company",
      config: {
        targetType: "project",
        properties: ["company"],
        title: "Projects",
        icon: "briefcase",
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

export default companyConfig;
