import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
date: {{date}}
location: []
---
`;

const companyConfig: CRMEntityConfig<
  "company",
  | { type: "teams"; collapsed?: boolean }
  | { type: "employees"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "company-tasks"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
> = {
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
      type: "documents",
      collapsed: true,
    },
    {
      type: "employees",
    },
    {
      type: "teams",
    },
    {
      type: "projects",
    },
    {
      type: "facts",
    },
    {
      type: "logs",
    },
    {
      type: "company-tasks",
    },
  ],
};

export default companyConfig;
