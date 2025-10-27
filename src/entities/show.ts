import type { CRMEntityConfig } from "@/types/CRMEntityConfig";
import { makeDefaultBacklinks } from "@/entities/default-backlinks";

const template = `
date: {{date}}
format: movie
genre: []
---
`;

const showConfig: CRMEntityConfig<"show"> = {
  type: "show",
  name: "Shows",
  icon: "clapperboard",
  dashboard: {},
  settings: {
    template,
  },
  aliases: ["movie", "movies"],
  list: {
    columns: ["cover", "show", "format", "status", "platform", "release_date"],
  },
  links: makeDefaultBacklinks(["show"]),
};

export default showConfig;
