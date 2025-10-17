import type { CRMEntityListRow } from "@/views/entity-panel-view/useCRMEntityPanel";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

type EntityCellProps = {
  value: unknown;
  row: CRMEntityListRow;
  column: string;
};

export const EntityCell = ({ value }: EntityCellProps) => {
  const display = formatValue(value);
  return <span>{display.length > 0 ? display : "—"}</span>;
};
