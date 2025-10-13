import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date:YYYY-MM-DD}}
time: {{time:HH:mm}}
location:
participants:
team:
project:
---
# Agenda

# Notes

# Decisions

# Action Items

# Follow Up

`;

const meetingConfig: CRMEntityConfig<"meeting"> = {
  type: "meeting",
  name: "Meetings",
  icon: "calendar-clock",
  dashboard: {
    helper: "Open or create a new Meeting",
    placeholder: "Search meetings...",
  },
  settings: {
    entity: {
      helper: "type=meeting",
    },
    template: {
      helper: "Template for new meetings notes.",
      default: template,
    },
  },
  list: {
    columns: ["date_time", "participants"],
    sort: { column: "date_time", direction: "desc" },
  },
};

export default meetingConfig;
