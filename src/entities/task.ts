import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
status: open
project: []
participants: []
---
`;

const taskConfig: CRMEntityConfig<
  "task",
  | { type: "participants-assignment" }
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "task-subtasks"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
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
    { type: "task-subtasks" },
    { type: "documents" },
  ],
};

export default taskConfig;
