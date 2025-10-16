import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const roleConfig: CRMEntityConfig<
  "role",
  | { type: "role-people"; collapsed?: boolean }
  | { type: "role-tasks"; collapsed?: boolean }
> = {
  type: "role",
  name: "Roles",
  icon: "briefcase",
  dashboard: {},
  settings: {
    template: DEFAULT_TEMPLATE,
  },
  list: {
    columns: ["show"],
  },
  links: [{ type: "role-people" }, { type: "role-tasks" }],
};

export default roleConfig;
