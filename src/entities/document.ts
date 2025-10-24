import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: document
category:
file:
related: []
---

# Notes

`;

const documentConfig: CRMEntityConfig<"document"> = {
  type: "document",
  name: "Documents",
  icon: "file-text",
  aliases: ["documents"],
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "category", "file"],
  },
};

export default documentConfig;
