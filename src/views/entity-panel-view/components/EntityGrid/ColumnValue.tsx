import {
  getColumnValue,
  type MondoEntityListColumn,
  type MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import {
  EntityCell,
  EntityCompanyAreaCell,
  EntityCountryRegionCell,
  EntityCoverCell,
  EntityDateCell,
  EntityLinksCell,
  EntityLocationPeopleCell,
  EntityMembersCell,
  EntityTitleCell,
  EntityUrlCell,
} from "./cells";

type ColumnValueProps = {
  column: MondoEntityListColumn;
  row: MondoEntityListRow;
};

export const ColumnValue = ({ column, row }: ColumnValueProps) => {
  const value = getColumnValue(row, column);

  switch (column.type) {
    case "cover":
      return <EntityCoverCell row={row} column={column} value={value} />;
    case "title":
      return <EntityTitleCell row={row} column={column} value={value} />;
    case "date":
      return <EntityDateCell row={row} column={column} value={value} />;
    case "link":
      return (
        <EntityLinksCell
          row={row}
          column={column}
          value={value}
          mode={column.mode ?? "inline"}
        />
      );
    case "companyArea":
      return <EntityCompanyAreaCell row={row} column={column} value={value} />;
    case "countryRegion":
      return <EntityCountryRegionCell row={row} column={column} value={value} />;
    case "members":
      return <EntityMembersCell row={row} column={column} value={value} />;
    case "locationPeople":
      return <EntityLocationPeopleCell row={row} column={column} value={value} />;
    case "url":
      return <EntityUrlCell row={row} column={column} value={value} />;
    case "value":
    default:
      return <EntityCell row={row} column={column} value={value} />;
  }
};
