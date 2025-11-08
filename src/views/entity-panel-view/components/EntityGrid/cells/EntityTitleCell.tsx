import type {
  MondoEntityListColumn,
  MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";

type EntityTitleCellProps = {
  row: MondoEntityListRow;
  value: unknown;
  column: MondoEntityListColumn;
};

export const EntityTitleCell = ({ row, value }: EntityTitleCellProps) => {
  const label =
    typeof value === "string" && value.trim().length > 0 ? value : row.label;

  return <MondoFileLink path={row.path} label={String(label)} />;
};
