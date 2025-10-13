import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type { TCachedFile } from "@/types/TCachedFile";

type RestaurantsTableProps = {
  items: TCachedFile[];
};

export const RestaurantsTable = ({ items }: RestaurantsTableProps) => (
  <Table>
    <tbody>
      {items.map((entry) => {
        const label =
          entry.cache?.frontmatter?.show ??
          entry.cache?.frontmatter?.name ??
          entry.file.basename;

        const cuisine =
          entry.cache?.frontmatter?.cuisine ??
          entry.cache?.frontmatter?.category ??
          null;

        return (
          <Table.Row key={entry.file.path}>
            <Table.Cell>
              <Button to={entry.file.path} variant="link">
                {label}
              </Button>
            </Table.Cell>
            <Table.Cell>
              {cuisine ? (
                <span style={{ color: "var(--text-muted)" }}>
                  {String(cuisine)}
                </span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>—</span>
              )}
            </Table.Cell>
          </Table.Row>
        );
      })}
    </tbody>
  </Table>
);

export default RestaurantsTable;
