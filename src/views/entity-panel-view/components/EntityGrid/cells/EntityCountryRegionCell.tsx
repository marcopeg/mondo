import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";

type EntityCountryRegionCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatValue(entry))
      .filter((entry) => entry.length > 0)
      .join(", ");
  }
  return String(value).trim();
};

export const EntityCountryRegionCell = ({ value }: EntityCountryRegionCellProps) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return <span>—</span>;
  }

  const data = value as { country?: unknown; region?: unknown };
  const country = formatValue(data.country);
  const region = formatValue(data.region);

  if (!country && !region) {
    return <span>—</span>;
  }

  const parts = [country, region].filter((part) => part.length > 0);
  const combined = parts.join(", ");

  return <span>{combined}</span>;
};
