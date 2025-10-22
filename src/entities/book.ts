import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: book
cover:
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
    columns: ["cover", "show", "author", "status", "genre"],
  },
};

export default bookConfig;
