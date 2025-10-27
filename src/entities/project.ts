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
    {
      type: "backlinks",
      key: "meetings",
      config: {
        title: "Meetings",
        icon: "calendar",
        targetType: "meeting",
        properties: ["project"],
        filter: {
          any: [
            { "participants.length": { eq: 0 } },
            { "participants.length": { gt: 1 } },
          ],
        },
        sort: {
          strategy: "column",
          column: "date",
          direction: "desc",
        },
        columns: [
          { type: "show" },
          { type: "attribute", key: "participants" },
          { type: "date", align: "right" },
        ],
        createEntity: {
          enabled: true,
          title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
          attributes: {
            participants: ["{@this}"],
          },
        },
      },
    },
    ...makeDefaultBacklinks(["project"]),
  ],
};

export default projectConfig;
