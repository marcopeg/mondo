import { useMemo } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type {
  MondoEntityListColumn,
  MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";

type MoreInfo = {
  hasMore: boolean;
  totalCount?: number;
  rolePath?: string;
};

const extractEntries = (value: unknown): { entries: string[]; moreInfo: MoreInfo } => {
  const moreInfo: MoreInfo = { hasMore: false };
  
  if (!value) return { entries: [], moreInfo };
  if (Array.isArray(value)) {
    const entries: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && item.startsWith("__MORE__:")) {
        // Extract metadata: __MORE__:totalCount:rolePath
        const parts = item.split(":");
        if (parts.length >= 3) {
          const count = Number(parts[1]);
          if (!Number.isNaN(count) && count > 0) {
            moreInfo.hasMore = true;
            moreInfo.totalCount = count;
            moreInfo.rolePath = parts.slice(2).join(":"); // Handle paths with colons
          }
        }
      } else {
        const nested = extractEntries(item);
        entries.push(...nested.entries);
        if (nested.moreInfo.hasMore) {
          Object.assign(moreInfo, nested.moreInfo);
        }
      }
    }
    return { entries, moreInfo };
  }
  if (typeof value === "string") {
    if (value.startsWith("__MORE__:")) {
      const parts = value.split(":");
      if (parts.length >= 3) {
        const count = Number(parts[1]);
        if (!Number.isNaN(count) && count > 0) {
          moreInfo.hasMore = true;
          moreInfo.totalCount = count;
          moreInfo.rolePath = parts.slice(2).join(":");
        }
      }
      return { entries: [], moreInfo };
    }
    return {
      entries: value
        .split(/[,;\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
      moreInfo,
    };
  }
  return { entries: [], moreInfo };
};

type LinkEntry = {
  label: string;
  path?: string;
};

type EntityLinksCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: MondoEntityListColumn;
  mode?: "inline" | "bullet";
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

export const EntityLinksCell = ({ value, mode }: EntityLinksCellProps) => {
  const app = useApp();

  const { links, moreInfo } = useMemo(() => {
    const { entries, moreInfo } = extractEntries(value);

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

    return { links, moreInfo };
  }, [app, value]);

  if (links.length === 0 && !moreInfo.hasMore) {
    return <span>—</span>;
  }

  if (mode === "bullet") {
    return (
      <ul className="list-disc pl-4 text-sm text-[var(--text-normal)]">
        {links.map((link, index) => {
          const key = `${link.path ?? link.label}-${index}`;
          const content = link.path ? (
            <MondoFileLink path={link.path} label={link.label} />
          ) : (
            <span className="rounded bg-[var(--background-modifier-hover)] px-2 py-1 text-xs">
              {link.label}
            </span>
          );

          return <li key={key}>{content}</li>;
        })}
        {moreInfo.hasMore && moreInfo.rolePath && (
          <li key="more">
            <MondoFileLink path={moreInfo.rolePath} label="..." />
          </li>
        )}
      </ul>
    );
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
        const isLast = index === links.length - 1;

        return (
          <span key={key}>
            {content}
            {!isLast && <span>, </span>}
          </span>
        );
      })}
      {moreInfo.hasMore && moreInfo.rolePath && (
        <>
          {links.length > 0 && <span>, </span>}
          {/* rolePath is always set when hasMore is true based on marker parsing */}
          <MondoFileLink path={moreInfo.rolePath} label="..." />
        </>
      )}
    </span>
  );
};
