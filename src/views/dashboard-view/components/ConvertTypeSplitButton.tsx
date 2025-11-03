import React from "react";
import SplitButton from "@/components/ui/SplitButton";
import { MONDO_ENTITIES, MONDO_ENTITY_TYPES, onMondoConfigChange } from "@/entities";
import { useSetting } from "@/hooks/use-setting";
import { sanitizeEntityTypeList } from "@/utils/sanitizeEntityTypeList";
import {
  DAILY_NOTE_TYPE,
  LEGACY_DAILY_NOTE_TYPE,
  type MondoFileType,
} from "@/types/MondoFileType";

type Props = {
  disabled?: boolean;
  canAssignToSelf?: boolean;
  className?: string;
  toggleClassName?: string;
  menuAriaLabel?: string;
  labelWhenNoAssign?: string;
  onPrimary: (type: MondoFileType) => void;
  onSelectType: (type: MondoFileType) => void;
};

const toTitleCase = (value: string) => {
  if (!value) return "";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const resolveTypeMeta = (type: MondoFileType) => MONDO_ENTITIES[type as keyof typeof MONDO_ENTITIES];
const resolveTypeLabel = (type: MondoFileType) => {
  const meta = resolveTypeMeta(type);
  if (meta?.name) return meta.name;
  return toTitleCase(type);
};
const resolveTypeIcon = (type: MondoFileType) => resolveTypeMeta(type)?.icon ?? "file-plus";

const buildConvertTypesFrom = (availableTypes: string[]): MondoFileType[] => {
  const normalized = new Set<string>();
  const result: MondoFileType[] = [];

  const pushType = (raw: string | null | undefined) => {
    if (!raw) return;
    const type = raw.trim().toLowerCase();
    if (!type || normalized.has(type) || type === DAILY_NOTE_TYPE || type === LEGACY_DAILY_NOTE_TYPE) return;
    // only include types that are present in the provided availableTypes
    if (!availableTypes.includes(type)) return;
    normalized.add(type);
    result.push(type as MondoFileType);
  };

  // If availableTypes is from the setting (not the full list), preserve its order
  // Otherwise, use the preferred order
  const preferred: MondoFileType[] = ["task", "note", "project", "log"] as MondoFileType[];
  const isCustomList = availableTypes.length < MONDO_ENTITY_TYPES.length;
  
  if (isCustomList) {
    // Preserve the order from availableTypes (settings)
    availableTypes.forEach(pushType);
  } else {
    // Use preferred order for the full list
    preferred.forEach(pushType);
    availableTypes.forEach(pushType);
  }

  return result;
};

export const ConvertTypeSplitButton = ({
  disabled = false,
  canAssignToSelf = false,
  className,
  toggleClassName,
  menuAriaLabel = "Choose note type",
  labelWhenNoAssign = "convert",
  onPrimary,
  onSelectType,
}: Props) => {
  const quickTasksEntitiesOverride = useSetting<MondoFileType[]>(
    "quickTasksEntities",
    []
  );

  const [options, setOptions] = React.useState<MondoFileType[]>(() => {
    // If the setting is populated, use it; otherwise use the full list
    if (quickTasksEntitiesOverride && quickTasksEntitiesOverride.length > 0) {
      return buildConvertTypesFrom(quickTasksEntitiesOverride);
    }
    return buildConvertTypesFrom(MONDO_ENTITY_TYPES as any);
  });

  React.useEffect(() => {
    // Initialize and subscribe to config changes so the list follows the current configuration
    if (quickTasksEntitiesOverride && quickTasksEntitiesOverride.length > 0) {
      setOptions(buildConvertTypesFrom(quickTasksEntitiesOverride));
    } else {
      setOptions(buildConvertTypesFrom(MONDO_ENTITY_TYPES as any));
    }
    
    const off = onMondoConfigChange(() => {
      if (quickTasksEntitiesOverride && quickTasksEntitiesOverride.length > 0) {
        setOptions(buildConvertTypesFrom(quickTasksEntitiesOverride));
      } else {
        setOptions(buildConvertTypesFrom(MONDO_ENTITY_TYPES as any));
      }
    });
    return () => off();
  }, [quickTasksEntitiesOverride]);

  if (!options || options.length === 0) {
    // if there are no configured entity types, skip rendering
    return null;
  }

  const primaryType = options[0];
  const secondaryTypes = primaryType ? options.slice(1) : [];

  if (!primaryType) {
    return (
      <button className={className} disabled>
        {labelWhenNoAssign}
      </button>
    );
  }

  return (
    <SplitButton
      type="button"
      className={className}
      toggleClassName={toggleClassName}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        if (primaryType === "task" && !canAssignToSelf) return;
        onPrimary(primaryType);
      }}
      icon={resolveTypeIcon(primaryType)}
      menuAriaLabel={menuAriaLabel}
      primaryOpensMenu={!canAssignToSelf}
      secondaryActions={secondaryTypes.map((type) => ({
        label: resolveTypeLabel(type),
        icon: resolveTypeIcon(type),
        disabled,
        onSelect: () => {
          if (disabled) return;
          onSelectType(type);
        },
      }))}
    >
      {canAssignToSelf ? resolveTypeLabel(primaryType) : labelWhenNoAssign}
    </SplitButton>
  );
};

export default ConvertTypeSplitButton;
