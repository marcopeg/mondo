import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const locationConfig: CRMEntityConfig<"location"> = {
  type: "location",
  name: "Locations",
  icon: "map-pin",
  dashboard: {},
  settings: {
    template: DEFAULT_TEMPLATE,
  },
  list: {
    columns: ["show"],
  },
};

export default locationConfig;
