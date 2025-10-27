import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
---
`;

const factConfig: CRMEntityConfig<"fact"> = {
  type: "fact",
  name: "Facts",
  icon: "bookmark",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["date", "show"],
    sort: { column: "date", direction: "desc" },
  },
  links: [...DEFAULT_BACKLINKS],
};

export default factConfig;
