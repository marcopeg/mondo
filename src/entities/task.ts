import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: task
show: "{{title}}"
status: open
related:
---

`;

const taskConfig: CRMEntityConfig<"task"> = {
  type: "task",
  name: "Tasks",
  icon: "check-square",
  dashboard: {
    helper: "Open or create a task",
    placeholder: "Search tasks...",
  },
  settings: {
    entity: {
      helper: "type=task",
    },
    template: {
      helper: "Template for new task notes.",
      default: template,
    },
  },
  list: {
    columns: ["show", "status"],
  },
};

export default taskConfig;
