import { DEFAULT_TEMPLATE } from "./default-template";
import type { CRMEntityConfig } from "@/types/CRMEntityConfig";

const roleConfig: CRMEntityConfig<"role"> = {
  type: "role",
  name: "Roles",
  icon: "briefcase",
  dashboard: {
    helper: "Open or create a new Role",
    placeholder: "Search roles...",
  },
  settings: {
    entity: {
      helper: "type=role",
    },
    template: {
      helper: "Template for new roles notes.",
      default: DEFAULT_TEMPLATE,
    },
  },
  list: {
    columns: ["show"],
  },
};

export default roleConfig;
