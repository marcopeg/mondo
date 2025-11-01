import { MONDO_ENTITY_TYPES, type MondoEntityType } from "@/entities";
import { isMondoEntityType } from "@/types/MondoFileType";
import { EntityHeaderMondo } from "./EntityHeaderMondo";
import { EntityHeaderUnknown } from "./EntityHeaderUnknown";
import { useSetting } from "@/hooks/use-setting";

type EntityHeaderProps = {
  type: string | null;
};

export const EntityHeader = ({ type }: EntityHeaderProps) => {
  // React to global setting changes to re-render this delegator
  const hideUnknown = useSetting<boolean>(
    "hideIMSHeaderOnUnknownNotes",
    false
  );
  if (MONDO_ENTITY_TYPES.length === 0) {
    return null;
  }

  if (typeof type === "string" && isMondoEntityType(type)) {
    const entityType: MondoEntityType = type;
    return <EntityHeaderMondo entityType={entityType} />;
  }

  if (hideUnknown) {
    return null;
  }
  return <EntityHeaderUnknown />;
};

export default EntityHeader;
