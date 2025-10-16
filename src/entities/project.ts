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
  | { type: "meetings" }
  | { type: "facts"; collapsed?: boolean }
> = {
  type: "project",
  name: "Projects",
  icon: "folder-git-2",
  dashboard: {
    placeholder: "Search projects...",
  },
  settings: {
    template: {
      default: template,
    },
  },
  list: {
    columns: ["show"],
  },
  links: [
    { type: "participants-assignment" },
    { type: "meetings" },
    { type: "facts" },
  ],
};

export default projectConfig;
