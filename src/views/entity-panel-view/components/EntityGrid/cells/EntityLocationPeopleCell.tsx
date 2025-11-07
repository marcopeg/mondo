import { useMemo, useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";
import { Cover } from "@/components/ui/Cover";
import { MondoFileLink } from "../../MondoFileLink";
import { extractEntries, processLinkEntries } from "./linkUtils";

type EntityLocationPeopleCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

type PersonWithCover = {
  path: string;
  cover: unknown;
};

const extractFirstEntry = (value: unknown): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = extractFirstEntry(entry);
      if (result) return result;
    }
    return null;
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  return null;
};

const parseWikiLink = (raw: string) => {
  const inner = raw.slice(2, -2);
  const [target] = inner.split("|");
  return target.trim();
};

export const EntityLocationPeopleCell = ({ value, row }: EntityLocationPeopleCellProps) => {
  const app = useApp();

  const { people, hasMore, total, isLocationPeople, roleLinks } = useMemo(() => {
    if (!Array.isArray(value)) {
      return { people: [], hasMore: false, total: 0, isLocationPeople: false, roleLinks: [] };
    }

    // Check if this is location people data (array of objects) or role people data (array of strings)
    const isLocationPeople = value.length > 0 && typeof value[0] === "object" && value[0] !== null && "path" in value[0];

    if (!isLocationPeople) {
      // This is role people data (array of wiki link strings), process as links
      const entries = extractEntries(value);
      const links = processLinkEntries(app, entries);
      return { people: [], hasMore: false, total: 0, isLocationPeople: false, roleLinks: links };
    }

    const hasMore = row.frontmatter?.people_has_more === true;
    const total = (row.frontmatter?.people_total ?? 0) as number;

    return { people: value as PersonWithCover[], hasMore, total, isLocationPeople, roleLinks: [] };
  }, [value, row.frontmatter, app]);

  const getCoverFile = useCallback((coverValue: unknown): TFile | null => {
    const raw = extractFirstEntry(coverValue);
    if (!raw) return null;

    let target = raw;
    if (raw.startsWith("[[") && raw.endsWith("]]")) {
      target = parseWikiLink(raw);
    }

    const file = app.vault.getAbstractFileByPath(target);
    if (file instanceof TFile) {
      return file;
    }

    const normalized = target.replace(/\.md$/i, "");
    const dest = app.metadataCache.getFirstLinkpathDest(normalized, "");
    return dest instanceof TFile ? dest : null;
  }, [app]);

  const handleOpenPerson = useCallback(async (personPath: string) => {
    const file = app.vault.getAbstractFileByPath(personPath);
    if (!(file instanceof TFile)) return;
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
    app.workspace.revealLeaf(leaf);
  }, [app]);

  if (people.length === 0 && !hasMore && roleLinks.length === 0) {
    return <span>—</span>;
  }

  // If this is role people data (not location people), render as links
  if (!isLocationPeople && roleLinks.length > 0) {
    return (
      <span>
        {roleLinks.map((link, index) => {
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
              {index < roleLinks.length - 1 && <span>, </span>}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {people.map((person, index) => {
        const coverFile = getCoverFile(person.cover);
        const resourcePath = coverFile ? app.vault.getResourcePath(coverFile) : null;
        const personFile = app.vault.getAbstractFileByPath(person.path);
        const personName = personFile instanceof TFile ? personFile.basename : "Person";

        return (
          <div key={`${person.path}-${index}`} className="flex-shrink-0">
            <Cover
              src={resourcePath}
              alt={personName}
              size={32}
              strategy="cover"
              coverClassName="border border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
              placeholderClassName="border border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
              placeholderVariant="solid"
              placeholderIcon="user"
              placeholderIconClassName="h-4 w-4"
              editLabel={`Open ${personName}`}
              onEditCover={() => handleOpenPerson(person.path)}
            />
          </div>
        );
      })}
      {hasMore && (
        <span className="text-xs text-[var(--text-muted)] ml-1">
          +{total - people.length} more
        </span>
      )}
    </div>
  );
};
