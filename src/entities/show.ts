import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `
date: {{date}}
format: movie
genre: []
---
`;

const showConfig: CRMEntityConfig<
  "show",
  | { type: "documents"; collapsed?: boolean }
> = {
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
  links: [
    {
      type: "documents",
      collapsed: true,
    },
  ],
};

export default showConfig;
