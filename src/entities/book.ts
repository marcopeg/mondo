import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: book
author:
status:
genre:
progress:
---

# Notes

`;

const bookConfig: CRMEntityConfig<"book"> = {
  type: "book",
  name: "Books",
  icon: "book",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "author", "status", "genre"],
  },
};

export default bookConfig;
