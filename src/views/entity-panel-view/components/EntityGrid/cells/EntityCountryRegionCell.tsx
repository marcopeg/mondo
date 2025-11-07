import { useMemo } from "react";
import { useApp } from "@/hooks/use-app";
import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";
import { extractEntries, processLinkEntries, type LinkEntry } from "./linkUtils";

type EntityCountryRegionCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

export const EntityCountryRegionCell = ({ value }: EntityCountryRegionCellProps) => {
  const app = useApp();

  const { countryLinks, regionLinks } = useMemo(() => {
    if (!value || typeof value !== "object") {
      return { countryLinks: [], regionLinks: [] };
    }

    const data = value as { country?: unknown; region?: unknown };
    const countryEntries = extractEntries(data.country);
    const regionEntries = extractEntries(data.region);

    const countryLinks = processLinkEntries(app, countryEntries);
    const regionLinks = processLinkEntries(app, regionEntries);

    return { countryLinks, regionLinks };
  }, [app, value]);

  if (countryLinks.length === 0 && regionLinks.length === 0) {
    return <span>—</span>;
  }

  const renderLinks = (links: LinkEntry[]) => (
    <>
      {links.map((link, index) => {
        const key = `${link.path ?? link.label}-${index}`;
        const content = link.path ? (
          <MondoFileLink path={link.path} label={link.label} />
        ) : (
          <span>{link.label}</span>
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

  return (
    <span>
      {countryLinks.length > 0 && renderLinks(countryLinks)}
      {countryLinks.length > 0 && regionLinks.length > 0 && <span>, </span>}
      {regionLinks.length > 0 && renderLinks(regionLinks)}
    </span>
  );
};
