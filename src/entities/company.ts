import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

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
        sort: {
          strategy: "column",
          column: "show",
          direction: "asc",
        },
        columns: [
          { type: "cover" },
          { type: "show" },
          { type: "attribute", key: "team" },
          { type: "attribute", key: "role" },
        ],
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
        title: "Projects",
        icon: "folder-git-2",
        // Use the graph-based `find` DSL to include:
        // 1) Projects that link directly to the company via `company` frontmatter
        // 2) Projects that link to teams which in turn belong to this company
        find: {
          query: [
            {
              description: "Direct projects linked via company property",
              steps: [
                { in: { property: ["company"], type: "project" } },
                { unique: true },
              ],
            },
            {
              description:
                "Projects linked to teams that belong to this company",
              steps: [
                // Find teams that backlink to this company
                { in: { property: ["company"], type: "team" } },
                // From those teams, find projects that backlink to the team
                { in: { property: ["team", "teams"], type: "project" } },
                { unique: true },
              ],
            },
          ],
          combine: "union",
        },
        sort: {
          strategy: "manual",
        },
        columns: [
          { type: "show" },
          { type: "attribute", key: "status" },
          { type: "attribute", key: "team" },
          { type: "date", align: "right" },
        ],
      },
    },
    ...makeDefaultBacklinks(["company"]),
  ],
};

export default companyConfig;
