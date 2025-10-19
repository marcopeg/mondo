import { useCallback, useEffect, useMemo, useState } from "react";
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
    const priorityKey = `${frontmatterKey}Priority`;
    const raw = frontmatter?.[priorityKey];

    if (!raw) {
      return [] as string[];
    }

    if (Array.isArray(raw)) {
      return raw
        .map((value) => (typeof value === "string" ? value : ""))
        .filter((value): value is string => value.length > 0);
    }

    if (typeof raw === "string") {
      return [raw];
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

  useEffect(() => {
    setDisplayItems(orderedItems);
  }, [orderedItems]);

  const persistOrder = useCallback(
    (nextItems: TItem[]) => {
      if (!hostFile) {
        return;
      }

      const ids = nextItems
        .map((item) => getItemId(item))
        .filter((id): id is string => Boolean(id));

      const priorityKey = `${frontmatterKey}Priority`;

      void (async () => {
        try {
          await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
            if (ids.length > 0) {
              frontmatter[priorityKey] = ids;
            } else {
              delete frontmatter[priorityKey];
            }
          });
        } catch (error) {
          console.error(
            `useEntityLinkOrdering: failed to persist order for "${priorityKey}"`,
            error
          );
        }
      })();
    },
    [app, frontmatterKey, getItemId, hostFile]
  );

  const handleReorder = useCallback(
    (nextItems: TItem[]) => {
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
