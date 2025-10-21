import React from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Icon } from "@/components/ui/Icon";

const DEFAULT_PAGE_SIZE = 10;

// Custom modifier to restrict drag movement to vertical axis only
const restrictToVerticalAxis = ({ transform }: { transform: any }) => {
  return {
    ...transform,
    x: 0, // Force x-axis to 0, only allow y-axis movement
  };
};

type EntityLinksTableProps<T> = {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => React.Key;
  pageSize?: number;
  emptyLabel?: React.ReactNode;
  sortable?: boolean;
  onReorder?: (items: T[]) => void;
  getSortableId?: (item: T, index: number) => React.Key;
};

export const EntityLinksTable = <T,>({
  items,
  renderRow,
  getKey,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyLabel = (
    <span className="text-xs text-[var(--text-muted)]">No entries</span>
  ),
  sortable = false,
  onReorder,
  getSortableId,
}: EntityLinksTableProps<T>) => {
  const isSortable = sortable && typeof onReorder === "function";
  const getItemId = React.useCallback(
    (item: T, index: number): string | number => {
      const rawId = getSortableId
        ? getSortableId(item, index)
        : getKey(item, index);
      if (typeof rawId === "string" || typeof rawId === "number") {
        return rawId;
      }
      return String(rawId);
    },
    [getKey, getSortableId]
  );

  const [visibleCount, setVisibleCount] = React.useState(() =>
    isSortable ? items.length : Math.min(pageSize, items.length)
  );

  React.useEffect(() => {
    if (isSortable) {
      setVisibleCount(items.length);
      return;
    }

    setVisibleCount((previous) => {
      if (items.length <= pageSize) {
        return items.length;
      }
      if (previous <= 0) {
        return pageSize;
      }
      return Math.min(Math.max(pageSize, previous), items.length);
    });
  }, [isSortable, items.length, pageSize]);

  const visibleItems = React.useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    })
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!isSortable || !onReorder) {
        return;
      }

      const { active, over } = event;
      if (!active || !over || active.id === over.id) {
        return;
      }

      const allIds = items.map((item, index) => getItemId(item, index));
      const activeIndex = allIds.findIndex((id) => id === active.id);
      const overIndex = allIds.findIndex((id) => id === over.id);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      onReorder(arrayMove(items, activeIndex, overIndex));
    },
    [getItemId, isSortable, items, onReorder]
  );

  const handleLoadMore = React.useCallback(() => {
    setVisibleCount((previous) => Math.min(items.length, previous + pageSize));
  }, [items.length, pageSize]);

  const showLoadMore = !isSortable && items.length > visibleCount;

  const sortableItems = React.useMemo(
    () => visibleItems.map((item, index) => getItemId(item, index)),
    [getItemId, visibleItems]
  );

  const tableContent = (
    <Table className="w-full text-sm">
      {visibleItems.length > 0 ? (
        isSortable ? (
          <SortableContext
            items={sortableItems}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {visibleItems.map((item, index) => (
                <SortableRow
                  key={getKey(item, index)}
                  id={getItemId(item, index)}
                  withHandle
                >
                  {renderRow(item, index)}
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        ) : (
          <tbody>
            {visibleItems.map((item, index) => (
              <Table.Row
                key={getKey(item, index)}
                className="border-b border-[var(--background-modifier-border)] last:border-0 hover:bg-[var(--background-modifier-hover)]"
              >
                {renderRow(item, index)}
              </Table.Row>
            ))}
          </tbody>
        )
      ) : (
        <tbody>
          <Table.Row>
            <Table.Cell className="px-2 py-2 text-xs text-[var(--text-muted)]">
              {emptyLabel}
            </Table.Cell>
          </Table.Row>
        </tbody>
      )}
    </Table>
  );

  return (
    <div className="flex w-full flex-col gap-2 overflow-y-auto">
      {isSortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          {tableContent}
        </DndContext>
      ) : (
        tableContent
      )}
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

type SortableRowProps = {
  id: string | number;
  children: React.ReactNode;
  withHandle?: boolean;
};

const SortableRow = ({
  id,
  children,
  withHandle = false,
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Table.Row
      ref={setNodeRef}
      style={style}
      className={`border-b border-[var(--background-modifier-border)] last:border-0 hover:bg-[var(--background-modifier-hover)] ${
        isDragging ? "opacity-70" : ""
      }`}
      {...(!withHandle ? attributes : {})}
      {...(!withHandle ? listeners : {})}
    >
      {children}
      {withHandle ? (
        <Table.Cell className="w-10 px-2 py-2 align-middle text-right">
          <button
            type="button"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-transparent text-[var(--text-muted)] transition-colors touch-none cursor-grab active:cursor-grabbing hover:text-[var(--text-normal)] focus-visible:border-[var(--interactive-accent)] focus-visible:text-[var(--interactive-accent)]"
            aria-label="Reorder entry"
            {...attributes}
            {...listeners}
          >
            <Icon name="grip-vertical" className="mr-0 h-4 w-4" />
          </button>
        </Table.Cell>
      ) : null}
    </Table.Row>
  );
};
