import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: task
status: open
participants: []
---

`;

const taskConfig: CRMEntityConfig<
  "task",
  | { type: "participants-assignment" }
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "task-subtasks"; collapsed?: boolean }
> = {
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
    { type: "logs" },
    // Collapse subtasks by default; persisted per-note via crmState.subtasks.collapsed
    { type: "task-subtasks", collapsed: true },
  ],
};

export default taskConfig;
