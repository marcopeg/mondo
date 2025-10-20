import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: project
company:
team:
participants:
---

`;

const projectConfig: CRMEntityConfig<
  "project",
  | { type: "participants-assignment" }
  | { type: "project-tasks"; collapsed?: boolean }
  | { type: "meetings" }
  | { type: "facts"; collapsed?: boolean }
> = {
  type: "project",
  name: "Projects",
  icon: "folder-git-2",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show"],
  },
  links: [
    { type: "participants-assignment" },
    { type: "project-tasks", collapsed: false },
    { type: "meetings" },
    { type: "facts" },
  ],
};

export default projectConfig;
