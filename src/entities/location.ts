import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const locationConfig: CRMEntityConfig<
  "location",
  | { type: "location-people"; collapsed?: boolean }
  | { type: "location-companies"; collapsed?: boolean }
> = {
  type: "location",
  name: "Locations",
  icon: "map-pin",
  dashboard: {},
  settings: {
    template: DEFAULT_TEMPLATE,
  },
  list: {
    columns: ["cover", "show", "country", "region"],
  },
  links: [
    {
      type: "location-people",
    },
    {
      type: "location-companies",
      collapsed: true,
    },
  ],
};

export default locationConfig;
