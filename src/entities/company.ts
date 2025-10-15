import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
location: []
---

# Facts
- 
`;

const companyConfig: CRMEntityConfig<
  "company",
  | { type: "teams"; collapsed?: boolean }
  | { type: "employees"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
> = {
  type: "company",
  name: "Companies",
  icon: "building-2",
  dashboard: {
    helper: "Open or create a new Company",
    placeholder: "Search companies...",
  },
  settings: {
    entity: {
      helper: "type=company",
    },
    template: {
      helper: "Template for new companies notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "location"],
  },
  links: [
    {
      type: "teams",
    },
    {
      type: "projects",
    },
    {
      type: "employees",
      collapsed: true,
    },
    {
      type: "facts",
    },
  ],
};

export default companyConfig;
