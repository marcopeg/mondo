import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: tool
category:
owner:
location:
---

# Notes

`;

const toolConfig: CRMEntityConfig<"tool"> = {
  type: "tool",
  name: "Tools",
  icon: "hammer",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "category", "owner", "location"],
  },
};

export default toolConfig;
