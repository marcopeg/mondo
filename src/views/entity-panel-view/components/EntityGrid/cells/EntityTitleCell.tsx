import type { CRMEntityListRow } from "@/views/entity-panel-view/useCRMEntityPanel";
import { CRMFileLink } from "../../CRMFileLink";

type EntityTitleCellProps = {
  row: CRMEntityListRow;
  value: unknown;
  column: string;
};

export const EntityTitleCell = ({ row, value }: EntityTitleCellProps) => {
  const label =
    typeof value === "string" && value.trim().length > 0 ? value : row.label;

  return <CRMFileLink path={row.path} label={String(label)} />;
};
