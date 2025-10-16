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
    placeholder: "Search companies...",
  },
  settings: {
    template: {
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
