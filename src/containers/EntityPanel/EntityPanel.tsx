import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { EntityHeader } from "@/containers/EntityHeader";
import { EntityLinks } from "@/containers/EntityLinks";
import DailyNoteLinks from "@/containers/DailyNoteLinks";
import { EntityLinksLayoutProvider } from "@/context/EntityLinksLayoutContext";
import {
  isMondoEntityType,
  isMondoFileType,
  isDailyNoteType,
} from "@/types/MondoFileType";

const normalizeType = (rawType: unknown): string | null => {
  if (typeof rawType !== "string") {
    return null;
  }

  const value = rawType.trim().toLowerCase();
  return value.length > 0 ? value : null;
};

export const EntityPanel = () => {
  const { file } = useEntityFile();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [collapsedCardMode, setCollapsedCardMode] = useState<
    "compact" | "default"
  >("default");

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return () => {};
    }

    const threshold = 560;
    const resolveMode = (width: number) =>
      width <= threshold ? "compact" : "default";

    const measure = () => {
      const width = element.getBoundingClientRect().width;
      setCollapsedCardMode((previous) => {
        const next = resolveMode(width);
        return previous === next ? previous : next;
      });
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      let frame = 0;
      const observer = new ResizeObserver(() => {
        if (frame) {
          cancelAnimationFrame(frame);
        }
        frame = requestAnimationFrame(measure);
      });
      observer.observe(element);

      return () => {
        if (frame) {
          cancelAnimationFrame(frame);
        }
        observer.disconnect();
      };
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        window.removeEventListener("resize", measure);
      };
    }

    return () => {};
  }, []);

  const { type, showHeader, showEntityLinks, showDailyLinks } = useMemo(() => {
    const frontmatter = (file?.cache?.frontmatter ?? {}) as
      | Record<string, unknown>
      | undefined;
    const normalized = normalizeType(
      frontmatter?.mondoType ?? frontmatter?.type
    );

    if (!normalized) {
      return {
        type: null,
        showHeader: true,
        showEntityLinks: false,
        showDailyLinks: false,
      } as const;
    }

    const entity = isMondoEntityType(normalized);
    const daily = isDailyNoteType(normalized);

    return {
      type: normalized,
      showHeader: entity || !isMondoFileType(normalized),
      showEntityLinks: entity,
      showDailyLinks: daily,
    } as const;
  }, [file?.cache?.frontmatter]);

  if (!file) {
    return null;
  }

  const shouldRender = showHeader || showEntityLinks || showDailyLinks;

  if (!shouldRender) {
    return null;
  }

  return (
    <EntityLinksLayoutProvider>
      <div
        ref={containerRef}
        className="flex flex-col gap-2"
        data-collapsed-card-mode={collapsedCardMode}
        data-mondo-entity-panel-root
      >
        {showHeader && <EntityHeader type={type} />}
        {showEntityLinks && <EntityLinks />}
        {showDailyLinks && <DailyNoteLinks />}
      </div>
    </EntityLinksLayoutProvider>
  );
};

export default EntityPanel;
