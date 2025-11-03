import React from "react";
import SplitButton from "@/components/ui/SplitButton";
import { MONDO_ENTITIES, MONDO_ENTITY_TYPES } from "@/entities";
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

const buildConvertTypes = (): MondoFileType[] => {
  const preferred: MondoFileType[] = ["task", "note", "project", "log"] as MondoFileType[];
  const normalized = new Set<string>();
  const result: MondoFileType[] = [];

  const pushType = (raw: string | null | undefined) => {
    if (!raw) return;
    const type = raw.trim().toLowerCase();
    if (!type || normalized.has(type) || type === DAILY_NOTE_TYPE || type === LEGACY_DAILY_NOTE_TYPE) return;
    normalized.add(type);
    result.push(type as MondoFileType);
  };

  preferred.forEach(pushType);
  MONDO_ENTITY_TYPES.forEach(pushType);

  return result.length > 0 ? result : (["note"] as MondoFileType[]);
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
  const options = React.useMemo(buildConvertTypes, []);
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
