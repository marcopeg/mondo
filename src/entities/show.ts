import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

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
};

export default showConfig;
