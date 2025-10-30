import { MONDO_ENTITY_TYPES, type MondoEntityType } from "@/entities";
import { isMondoEntityType } from "@/types/MondoFileType";
import { EntityHeaderMondo } from "./EntityHeaderMondo";
import { EntityHeaderUnknown } from "./EntityHeaderUnknown";

type EntityHeaderProps = {
  type: string | null;
};

export const EntityHeader = ({ type }: EntityHeaderProps) => {
  if (MONDO_ENTITY_TYPES.length === 0) {
    return null;
  }

  if (typeof type === "string" && isMondoEntityType(type)) {
    const entityType: MondoEntityType = type;
    return <EntityHeaderMondo entityType={entityType} />;
  }

  return <EntityHeaderUnknown />;
};

export default EntityHeader;
