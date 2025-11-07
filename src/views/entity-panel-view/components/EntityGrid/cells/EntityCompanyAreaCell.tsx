import { useMemo } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";

const extractEntries = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractEntries(item));
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

type LinkEntry = {
  label: string;
  path?: string;
};

type EntityCompanyAreaCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

const parseWikiLink = (raw: string) => {
  const inner = raw.slice(2, -2);
  const [target, alias] = inner.split("|");
  return {
    target: target.trim(),
    label: (alias ?? target).trim(),
  };
};

const resolveFile = (app: ReturnType<typeof useApp>, target: string): TFile | null => {
  const byPath = app.vault.getAbstractFileByPath(target);
  if (byPath instanceof TFile) {
    return byPath;
  }

  const normalized = target.replace(/\.md$/i, "");
  const dest = app.metadataCache.getFirstLinkpathDest(normalized, "");
  return dest instanceof TFile ? dest : null;
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

    const companyLinks = companyEntries.map<LinkEntry>((entry) => {
      let label = entry;
      let target = entry;

      if (entry.startsWith("[[") && entry.endsWith("]]")) {
        const parsed = parseWikiLink(entry);
        label = parsed.label;
        target = parsed.target;
      }

      const file = resolveFile(app, target);
      const path = file?.path ?? (entry.startsWith("[[") ? undefined : target);
      const displayLabel = label.includes("/") ? label.split("/").pop() ?? label : label;

      return {
        label: displayLabel,
        path,
      };
    });

    const areaLinks = areaEntries.map<LinkEntry>((entry) => {
      let label = entry;
      let target = entry;

      if (entry.startsWith("[[") && entry.endsWith("]]")) {
        const parsed = parseWikiLink(entry);
        label = parsed.label;
        target = parsed.target;
      }

      const file = resolveFile(app, target);
      const path = file?.path ?? (entry.startsWith("[[") ? undefined : target);
      const displayLabel = label.includes("/") ? label.split("/").pop() ?? label : label;

      return {
        label: displayLabel,
        path,
      };
    });

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

  return (
    <div className="flex flex-col gap-1">
      {companyLinks.length > 0 && (
        <div className="flex items-center gap-1">
          {renderLinks(companyLinks)}
        </div>
      )}
      {areaLinks.length > 0 && (
        <div className="flex items-center gap-1">
          {renderLinks(areaLinks)}
        </div>
      )}
    </div>
  );
};
