import { useMemo } from "react";
import { useApp } from "@/hooks/use-app";
import type {
  MondoEntityListColumn,
  MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";
import { extractEntries, processLinkEntries, type LinkEntry } from "./linkUtils";

type EntityCompanyAreaCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: MondoEntityListColumn;
};

export const EntityCompanyAreaCell = ({ value }: EntityCompanyAreaCellProps) => {
  const app = useApp();

  const { companyLinks, areaLinks } = useMemo(() => {
    if (!value || typeof value !== "object") {
      return { companyLinks: [], areaLinks: [] };
    }

    const data = value as { company?: unknown; area?: unknown };
    const companyEntries = extractEntries(data.company);
    const areaEntries = extractEntries(data.area);

    const companyLinks = processLinkEntries(app, companyEntries);
    const areaLinks = processLinkEntries(app, areaEntries);

    return { companyLinks, areaLinks };
  }, [app, value]);

  if (companyLinks.length === 0 && areaLinks.length === 0) {
    return <span>—</span>;
  }

  const renderLinks = (links: LinkEntry[]) => (
    <>
      {links.map((link, index) => {
        const key = `${link.path ?? link.label}-${index}`;
        const content = link.path ? (
          <MondoFileLink path={link.path} label={link.label} />
        ) : (
          <span className="rounded bg-[var(--background-modifier-hover)] px-2 py-1 text-xs">
            {link.label}
          </span>
        );
        const isLast = index === links.length - 1;

        return (
          <span key={key}>
            {content}
            {!isLast && <span>, </span>}
          </span>
        );
      })}
    </>
  );

  const renderRow = (links: LinkEntry[]) =>
    links.length > 0 ? (
      <div className="flex items-center gap-1">{renderLinks(links)}</div>
    ) : null;

  return (
    <div className="flex flex-col gap-1">
      {renderRow(companyLinks)}
      {renderRow(areaLinks)}
    </div>
  );
};
