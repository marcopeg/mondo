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
  | { type: "facts"; collapsed?: boolean }
  | { type: "project-tasks"; collapsed?: boolean }
  | { type: "meetings" }
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
    { type: "facts" },
    { type: "meetings" },
    { type: "project-tasks", collapsed: true },
  ],
};

export default projectConfig;
