import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
company: []
team: []
participants: []
status: draft
---
`;

const projectConfig: CRMEntityConfig<"project"> = {
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
    // { type: "documents", collapsed: true },
    // { type: "participants-assignment" },
    // { type: "facts" },
    // { type: "logs" },
    // { type: "meetings" },
    // { type: "project-tasks", collapsed: true },
    ...makeDefaultBacklinks(["project"]),
  ],
};

export default projectConfig;
