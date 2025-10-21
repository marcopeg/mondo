import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: task
status: open
participants: []
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
  links: [
    { type: "participants-assignment" },
    { type: "facts" },
    { type: "task-subtasks", collapsed: false },
  ],
};

export default taskConfig;
