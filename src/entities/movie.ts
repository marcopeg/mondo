import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const template = `---
type: movie
director:
status:
platform:
release_date:
---

# Notes

`;

const movieConfig: CRMEntityConfig<"movie"> = {
  type: "movie",
  name: "Movies",
  icon: "clapperboard",
  dashboard: {},
  settings: {
    template,
  },
  list: {
    columns: ["show", "status", "platform", "release_date"],
  },
};

export default movieConfig;
