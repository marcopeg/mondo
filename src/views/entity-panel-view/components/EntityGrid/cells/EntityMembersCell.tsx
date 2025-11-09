import { useMemo } from "react";
import { useApp } from "@/hooks/use-app";
import type {
  MondoEntityListColumn,
  MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";
import { extractEntries, processLinkEntries } from "./linkUtils";

type EntityMembersCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: MondoEntityListColumn;
};

export const EntityMembersCell = ({ value, row }: EntityMembersCellProps) => {
  const app = useApp();

  const { links, hasMore } = useMemo(() => {
    const entries = extractEntries(value);
    const hasMore = row.frontmatter?.members_has_more === true;
    const links = processLinkEntries(app, entries);
    return { links, hasMore };
  }, [app, value, row.frontmatter]);

  if (links.length === 0 && !hasMore) {
    return <span>—</span>;
  }

  return (
    <span>
      {links.map((link, index) => {
        const key = `${link.path ?? link.label}-${index}`;
        const content = link.path ? (
          <MondoFileLink path={link.path} label={link.label} />
        ) : (
          <span className="rounded bg-[var(--background-modifier-hover)] px-2 py-1 text-xs">
            {link.label}
          </span>
        );

        return (
          <span key={key}>
            {content}
            {(index < links.length - 1 || hasMore) && <span>, </span>}
          </span>
        );
      })}
      {hasMore && <MondoFileLink path={row.path} label="..." />}
    </span>
  );
};
