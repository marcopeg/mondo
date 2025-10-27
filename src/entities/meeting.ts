import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
participants: []
location: []
---
`;

const meetingConfig: CRMEntityConfig<"meeting"> = {
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
  links: makeDefaultBacklinks(["meeting"]),
};

export default meetingConfig;
