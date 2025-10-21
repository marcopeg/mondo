import React from "react";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  children: React.ReactNode;
};
type RowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children: React.ReactNode;
};
type CellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  children: React.ReactNode;
};

const TableRoot: React.FC<TableProps> = ({
  children,
  className = "",
  ...rest
}) => (
  <div
    style={{ overflowX: "auto" }}
    className={`crm-table-wrapper ${className}`}
  >
    <table
      className={`crm-table ${className}`}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        borderSpacing: 0,
        tableLayout: "fixed",
      }}
      {...rest}
    >
      {children}
    </table>
  </div>
);

const TableRow = React.forwardRef<HTMLTableRowElement, RowProps>(
  ({ children, ...rest }, ref) => (
    <tr ref={ref} {...rest}>
      {children}
    </tr>
  )
);
TableRow.displayName = "TableRow";

const TableCell: React.FC<CellProps> = ({ children, style, ...rest }) => (
  <td style={{ ...(style as any) }} {...rest}>
    {children}
  </td>
);

const TableHeadCell: React.FC<CellProps> = ({ children, style, ...rest }) => (
  <th style={{ ...(style as any) }} {...rest}>
    {children}
  </th>
);

export const Table = Object.assign(TableRoot, {
  Row: TableRow,
  Cell: TableCell,
  HeadCell: TableHeadCell,
});

export default Table;
