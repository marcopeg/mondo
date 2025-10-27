import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { DEFAULT_BACKLINKS } from "@/entities/default-backlinks";

const template = `
date: {{date}}
---
`;

const logConfig: CRMEntityConfig<"log"> = {
  type: "log",
  name: "Logs",
  icon: "file-clock",
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

export default logConfig;
