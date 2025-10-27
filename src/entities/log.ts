import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

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
  links: makeDefaultBacklinks(["log"]),
};

export default logConfig;
