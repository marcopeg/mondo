import { useMemo, useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import type { MondoEntityListRow } from "@/views/entity-panel-view/useEntityPanels";
import { Cover } from "@/components/ui/Cover";
import { MondoFileLink } from "../../MondoFileLink";

type PersonInfo = {
  path: string;
  label: string;
  hasCover: boolean;
  coverFile: TFile | null;
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

const extractEntries = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractEntries(item));
  }
  if (typeof value === "string") {
    return [value.trim()].filter((entry) => entry.length > 0);
  }
  return [];
};

type EntityLocationPeopleCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

export const EntityLocationPeopleCell = ({ value, row }: EntityLocationPeopleCellProps) => {
  const app = useApp();

  const people = useMemo(() => {
    const entries = extractEntries(value);
    
    return entries.map<PersonInfo>((entry) => {
      // Check if entry has HAS_COVER marker
      const hasCoverMarker = entry.endsWith("|HAS_COVER");
      const cleanEntry = hasCoverMarker ? entry.replace("|HAS_COVER", "") : entry;
      
      let label = cleanEntry;
      let target = cleanEntry;

      if (cleanEntry.startsWith("[[") && cleanEntry.endsWith("]]")) {
        const parsed = parseWikiLink(cleanEntry);
        label = parsed.label;
        target = parsed.target;
      }

      const file = resolveFile(app, target);
      const path = file?.path ?? "";
      const displayLabel = label.includes("/") ? label.split("/").pop() ?? label : label;

      // Get cover file if person has a cover
      let coverFile: TFile | null = null;
      if (hasCoverMarker && file) {
        const cache = app.metadataCache.getFileCache(file);
        const coverValue = (cache?.frontmatter as Record<string, unknown> | undefined)?.cover;
        if (coverValue) {
          const coverTarget = typeof coverValue === "string" ? coverValue.trim() : "";
          if (coverTarget) {
            let coverPath = coverTarget;
            if (coverTarget.startsWith("[[") && coverTarget.endsWith("]]")) {
              coverPath = parseWikiLink(coverTarget).target;
            }
            coverFile = resolveFile(app, coverPath);
          }
        }
      }

      return {
        path,
        label: displayLabel,
        hasCover: hasCoverMarker && coverFile !== null,
        coverFile,
      };
    });
  }, [app, value]);

  const peopleWithCovers = people.filter(p => p.hasCover);
  const peopleWithoutCovers = people.filter(p => !p.hasCover);
  const hasMore = row.frontmatter?.people_has_more === true;

  if (people.length === 0) {
    return <span>—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Render covers first */}
      {peopleWithCovers.map((person, index) => {
        if (!person.coverFile) return null;
        
        const resourcePath = app.vault.getResourcePath(person.coverFile);
        const handleOpen = async () => {
          const file = app.vault.getAbstractFileByPath(person.path);
          if (!(file instanceof TFile)) return;
          const leaf = app.workspace.getLeaf(true);
          await leaf.openFile(file);
          app.workspace.revealLeaf(leaf);
        };

        return (
          <div key={`cover-${person.path}-${index}`} className="flex-shrink-0">
            <Cover
              src={resourcePath}
              alt={person.label}
              size={32}
              strategy="cover"
              coverClassName="border border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
              editLabel={`Open ${person.label}`}
              onEditCover={handleOpen}
            />
          </div>
        );
      })}
      
      {/* Render names for people without covers, comma-separated */}
      {peopleWithoutCovers.length > 0 && (
        <span className="flex flex-wrap items-center">
          {peopleWithoutCovers.map((person, index) => (
            <span key={`name-${person.path}-${index}`}>
              <MondoFileLink path={person.path} label={person.label} />
              {index < peopleWithoutCovers.length - 1 && <span>,&nbsp;</span>}
            </span>
          ))}
        </span>
      )}
      
      {/* Show "..." link to location page if there are more people */}
      {hasMore && (
        <>
          {(peopleWithCovers.length > 0 || peopleWithoutCovers.length > 0) && <span>,&nbsp;</span>}
          <MondoFileLink path={row.path} label="..." />
        </>
      )}
    </div>
  );
};
