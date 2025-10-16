import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const locationConfig: CRMEntityConfig<"location"> = {
  type: "location",
  name: "Locations",
  icon: "map-pin",
  dashboard: {
    placeholder: "Search locations...",
  },
  settings: {
    entity: {
      helper: "type=location",
    },
    template: {
      helper: "Template for new locations notes.",
      default: DEFAULT_TEMPLATE,
    },
  },
  list: {
    columns: ["show"],
  },
};

export default locationConfig;
