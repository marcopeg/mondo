import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";

interface UseEntityLinkOrderingOptions<TItem> {
  file: TCachedFile;
  items: TItem[];
  frontmatterKey: string;
  getItemId: (item: TItem) => string | undefined;
  fallbackSort?: (items: TItem[]) => TItem[];
}

interface UseEntityLinkOrderingResult<TItem> {
  items: TItem[];
  onReorder: ((items: TItem[]) => void) | undefined;
  sortable: boolean;
}

export const useEntityLinkOrdering = <TItem>(
  options: UseEntityLinkOrderingOptions<TItem>
): UseEntityLinkOrderingResult<TItem> => {
  const { file, items, frontmatterKey, getItemId, fallbackSort } = options;
  const app = useApp();
  const hostFile = file.file;

  const normalizedItems = useMemo(() => {
    return items.filter((item) => Boolean(getItemId(item)));
  }, [getItemId, items]);

  const orderFromFrontmatter = useMemo(() => {
    const frontmatter = file.cache?.frontmatter as
      | Record<string, unknown>
      | undefined;

    // Read from mondoState.{panel}.order
    const rawOrder = (frontmatter as any)?.mondoState?.[frontmatterKey]?.order;

    if (!rawOrder) {
      return [] as string[];
    }

    if (Array.isArray(rawOrder)) {
      return rawOrder
        .map((value) => (typeof value === "string" ? value : ""))
        .filter((value): value is string => value.length > 0);
    }

    if (typeof rawOrder === "string") {
      return [rawOrder];
    }

    return [] as string[];
  }, [file.cache?.frontmatter, frontmatterKey]);

  const fallbackOrderedItems = useMemo(() => {
    if (typeof fallbackSort === "function") {
      return fallbackSort(normalizedItems);
    }
    return [...normalizedItems];
  }, [fallbackSort, normalizedItems]);

  const orderedItems = useMemo(() => {
    if (orderFromFrontmatter.length === 0) {
      return fallbackOrderedItems;
    }

    const mapped = new Map(
      fallbackOrderedItems
        .map((item) => {
          const id = getItemId(item);
          return id ? [id, item] : null;
        })
        .filter((entry): entry is [string, TItem] => Boolean(entry))
    );

    const used = new Set<string>();
    const prioritized: TItem[] = [];

    orderFromFrontmatter.forEach((id) => {
      const match = mapped.get(id);
      if (match) {
        prioritized.push(match);
        used.add(id);
      }
    });

    const remaining = fallbackOrderedItems.filter((item) => {
      const id = getItemId(item);
      if (!id) {
        return false;
      }
      return !used.has(id);
    });

    return [...prioritized, ...remaining];
  }, [fallbackOrderedItems, getItemId, orderFromFrontmatter]);

  const [displayItems, setDisplayItems] = useState(orderedItems);
  // Avoid visual flicker by not overwriting optimistic local order while
  // persistence is in-flight.
  const isPersistingRef = useRef(false);

  useEffect(() => {
    if (isPersistingRef.current) {
      // Skip syncing from derived order while we're persisting a manual reorder.
      // This prevents a brief revert to fallback order before the saved order
      // is read back from frontmatter.
      return;
    }
    // Avoid infinite update loops by skipping state updates when the
    // semantic order hasn't changed. Arrays are often recreated upstream
    // (e.g., sorting, spreading) which would otherwise retrigger renders.
    const ids = (arr: TItem[]) =>
      arr
        .map((item) => getItemId(item))
        .filter((id): id is string => Boolean(id));

    const prevIds = ids(displayItems);
    const nextIds = ids(orderedItems);

    const sameLength = prevIds.length === nextIds.length;
    const sameOrder = sameLength && prevIds.every((v, i) => v === nextIds[i]);

    if (!sameOrder) {
      setDisplayItems(orderedItems);
    }
  }, [orderedItems, displayItems, getItemId]);

  const persistOrder = useCallback(
    (nextItems: TItem[]) => {
      if (!hostFile) {
        return;
      }

      const ids = nextItems
        .map((item) => getItemId(item))
        .filter((id): id is string => Boolean(id));

      void (async () => {
        try {
          await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
            // Ensure mondoState structure exists
            if (
              typeof (frontmatter as any).mondoState !== "object" ||
              (frontmatter as any).mondoState === null
            ) {
              (frontmatter as any).mondoState = {};
            }

            const panelState = (frontmatter as any).mondoState[frontmatterKey];
            if (typeof panelState !== "object" || panelState === null) {
              (frontmatter as any).mondoState[frontmatterKey] = {};
            }

            if (ids.length > 0) {
              (frontmatter as any).mondoState[frontmatterKey].order = ids;
            } else {
              // Remove empty order to keep frontmatter clean
              if ((frontmatter as any).mondoState[frontmatterKey]) {
                delete (frontmatter as any).mondoState[frontmatterKey].order;
              }
            }
          });
        } catch (error) {
          console.error(
            `useEntityLinkOrdering: failed to persist order for panel "${frontmatterKey}"`,
            error
          );
        } finally {
          isPersistingRef.current = false;
        }
      })();
    },
    [app, frontmatterKey, getItemId, hostFile]
  );

  const handleReorder = useCallback(
    (nextItems: TItem[]) => {
      isPersistingRef.current = true;
      setDisplayItems(nextItems);
      persistOrder(nextItems);
    },
    [persistOrder]
  );

  const sortable = Boolean(hostFile) && displayItems.length > 1;

  return {
    items: displayItems,
    onReorder: sortable ? handleReorder : undefined,
    sortable,
  };
};

export default useEntityLinkOrdering;
