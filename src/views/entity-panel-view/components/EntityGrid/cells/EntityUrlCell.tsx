import type {
  MondoEntityListColumn,
  MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  return String(value);
};

const isValidUrl = (str: string): boolean => {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

type EntityUrlCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: MondoEntityListColumn;
};

export const EntityUrlCell = ({ value }: EntityUrlCellProps) => {
  const display = formatValue(value);
  
  if (!display) {
    return <span>—</span>;
  }

  if (isValidUrl(display)) {
    return (
      <a
        href={display}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--link-color)] hover:text-[var(--link-color-hover)] underline"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {display}
      </a>
    );
  }

  return <span>{display}</span>;
};
