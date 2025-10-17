import React from "react";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";

const DEFAULT_PAGE_SIZE = 10;

type EntityLinksTableProps<T> = {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => React.Key;
  pageSize?: number;
  emptyLabel?: React.ReactNode;
};

export const EntityLinksTable = <T,>({
  items,
  renderRow,
  getKey,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyLabel = <span className="text-xs text-[var(--text-muted)]">No entries</span>,
}: EntityLinksTableProps<T>) => {
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(pageSize, items.length)
  );

  React.useEffect(() => {
    setVisibleCount((previous) => {
      if (items.length <= pageSize) {
        return items.length;
      }
      if (previous <= 0) {
        return pageSize;
      }
      return Math.min(Math.max(pageSize, previous), items.length);
    });
  }, [items.length, pageSize]);

  const visibleItems = React.useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const handleLoadMore = React.useCallback(() => {
    setVisibleCount((previous) =>
      Math.min(items.length, previous + pageSize)
    );
  }, [items.length, pageSize]);

  const showLoadMore = items.length > visibleCount;

  return (
    <div className="flex w-full flex-col gap-2">
      <Table className="w-full text-sm">
        <tbody>
          {visibleItems.length > 0 ? (
            visibleItems.map((item, index) => (
              <Table.Row
                key={getKey(item, index)}
                className="border-b border-[var(--background-modifier-border)] last:border-0 hover:bg-[var(--background-modifier-hover)]"
              >
                {renderRow(item, index)}
              </Table.Row>
            ))
          ) : (
            <Table.Row>
              <Table.Cell className="px-2 py-2 text-xs text-[var(--text-muted)]">
                {emptyLabel}
              </Table.Cell>
            </Table.Row>
          )}
        </tbody>
      </Table>
      {showLoadMore ? (
        <div className="flex w-full flex-col gap-2">
          <Separator />
          <Button
            type="button"
            variant="link"
            fullWidth
            className="px-2 py-2 text-xs"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default EntityLinksTable;
