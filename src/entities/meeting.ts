import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
participants:
location:
---
`;

const meetingConfig: CRMEntityConfig<
  "meeting",
  | { type: "facts"; collapsed?: boolean }
  | { type: "logs"; collapsed?: boolean }
  | { type: "meeting-tasks"; collapsed?: boolean }
  | { type: "documents"; collapsed?: boolean }
> = {
  type: "meeting",
  name: "Meetings",
  icon: "calendar-clock",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["date_time", "participants"],
    sort: { column: "date_time", direction: "desc" },
  },
  links: [
    {
      type: "documents",
      collapsed: true,
    },
    {
      type: "facts",
    },
    {
      type: "logs",
    },
    {
      type: "meeting-tasks",
      collapsed: true,
    },
  ],
};

export default meetingConfig;
