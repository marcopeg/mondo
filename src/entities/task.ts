import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
status: open
---
`;

const taskConfig: CRMEntityConfig<"task"> = {
  type: "task",
  name: "Tasks",
  icon: "check-square",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "participants", "status"],
  },
  links: [{ type: "participants-assignment" }, ...DEFAULT_BACKLINKS],
};

export default taskConfig;
