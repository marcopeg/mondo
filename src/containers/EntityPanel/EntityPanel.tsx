import { useMemo, useRef } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { EntityHeader } from "@/containers/EntityHeader";
import { EntityLinks } from "@/containers/EntityLinks";
import DailyNoteLinks from "@/containers/DailyNoteLinks";
import {
  isCRMEntityType,
  isCRMFileType,
  isDailyNoteType,
} from "@/types/CRMFileType";

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

  const { type, showHeader, showEntityLinks, showDailyLinks } = useMemo(() => {
    const frontmatter = (file?.cache?.frontmatter ?? {}) as
      | Record<string, unknown>
      | undefined;
    const normalized = normalizeType(frontmatter?.type);

    if (!normalized) {
      return {
        type: null,
        showHeader: true,
        showEntityLinks: false,
        showDailyLinks: false,
      } as const;
    }

    const entity = isCRMEntityType(normalized);
    const daily = isDailyNoteType(normalized);

    return {
      type: normalized,
      showHeader: entity || !isCRMFileType(normalized),
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
    <div
      ref={containerRef}
      className="flex flex-col gap-2"
      data-crm-entity-panel-root
    >
      {showHeader && <EntityHeader containerRef={containerRef} type={type} />}
      {showEntityLinks && <EntityLinks />}
      {showDailyLinks && <DailyNoteLinks />}
    </div>
  );
};

export default EntityPanel;
