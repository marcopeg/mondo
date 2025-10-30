import type { RefObject } from "react";
import { MONDO_ENTITY_TYPES, type MondoEntityType } from "@/entities";
import { isMondoEntityType } from "@/types/MondoFileType";
import { EntityHeaderMondo } from "./EntityHeaderMondo";
import { EntityHeaderUnknown } from "./EntityHeaderUnknown";

type EntityHeaderProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  type: string | null;
};

export const EntityHeader = ({ containerRef, type }: EntityHeaderProps) => {
  if (MONDO_ENTITY_TYPES.length === 0) {
    return null;
  }

  if (typeof type === "string" && isMondoEntityType(type)) {
    const entityType: MondoEntityType = type;
    return (
      <EntityHeaderMondo
        containerRef={containerRef}
        entityType={entityType}
      />
    );
  }

  return <EntityHeaderUnknown />;
};

export default EntityHeader;
