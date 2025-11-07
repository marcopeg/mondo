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

type EntityMembersCellProps = {
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

export const EntityMembersCell = ({ value, row }: EntityMembersCellProps) => {
  const app = useApp();

  const { links, hasMore } = useMemo(() => {
    const entries = extractEntries(value);
    const hasMore = row.frontmatter?.members_has_more === true;

    const links = entries.map<LinkEntry>((entry) => {
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

    return { links, hasMore };
  }, [app, value, row.frontmatter]);

  if (links.length === 0 && !hasMore) {
    return <span>—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {links.map((link, index) => {
        const key = `${link.path ?? link.label}-${index}`;
        const content = link.path ? (
          <MondoFileLink path={link.path} label={link.label} />
        ) : (
          <span className="rounded bg-[var(--background-modifier-hover)] px-2 py-1 text-xs">
            {link.label}
          </span>
        );

        return <div key={key}>{content}</div>;
      })}
      {hasMore && (
        <div>
          <MondoFileLink path={row.path} label="..." />
        </div>
      )}
    </div>
  );
};
