import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { CRMFileType } from "@/types/CRMFileType";
import type { CRMEntityType } from "@/entities";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { createFactForEntity } from "@/utils/createFactForEntity";
import type { TCachedFile } from "@/types/TCachedFile";

type FactsLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

type FactLinkRule = {
  property: string;
  mode: "single" | "list";
  subtitle: (entityName: string) => string;
};

const FACT_LINK_RULES: Partial<Record<CRMEntityType, FactLinkRule>> = {
  person: {
    property: "participants",
    mode: "list",
    subtitle: (name) => `Facts referencing ${name}`,
  },
  company: {
    property: "company",
    mode: "single",
    subtitle: (name) => `Facts about ${name}`,
  },
  team: {
    property: "team",
    mode: "single",
    subtitle: (name) => `Facts about ${name}`,
  },
  meeting: {
    property: "meeting",
    mode: "single",
    subtitle: () => "Facts related to this meeting",
  },
  task: {
    property: "task",
    mode: "single",
    subtitle: () => "Facts linked to this task",
  },
  project: {
    property: "project",
    mode: "single",
    subtitle: (name) => `Facts connected to ${name}`,
  },
  fact: {
    property: "fact",
    mode: "single",
    subtitle: (name) => `Child facts referencing ${name}`,
  },
};

type FactDateSource = "frontmatter" | "legacy" | "created" | null;

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseFactDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateString = getTrimmedString(value);
  if (!dateString) {
    return null;
  }

  const isoCandidate = dateString.includes("T")
    ? dateString
    : dateString.includes(" ")
    ? dateString.replace(" ", "T")
    : `${dateString}T00:00`;

  const parsed = new Date(isoCandidate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(dateString);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const combineFactDateAndTime = (
  dateValue: unknown,
  timeValue: unknown
): Date | null => {
  const dateString = getTrimmedString(dateValue);
  const timeString = getTrimmedString(timeValue);
  if (!dateString || !timeString) {
    return null;
  }

  const candidate = new Date(`${dateString}T${timeString}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const getFactDate = (fact: TCachedFile): { date: Date | null; source: FactDateSource } => {
  const frontmatter = fact.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  if (frontmatter) {
    const direct = parseFactDateValue(frontmatter.date);
    if (direct) {
      return { date: direct, source: "frontmatter" };
    }

    const combined = combineFactDateAndTime(frontmatter.date, frontmatter.time);
    if (combined) {
      return { date: combined, source: "legacy" };
    }

    const legacyDateTime =
      parseFactDateValue(frontmatter.datetime) ??
      parseFactDateValue(frontmatter.date_time);
    if (legacyDateTime) {
      return { date: legacyDateTime, source: "legacy" };
    }
  }

  const createdAt =
    typeof fact.file?.stat?.ctime === "number" ? new Date(fact.file.stat.ctime) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return { date: createdAt, source: "created" };
  }

  return { date: null, source: null };
};

const formatFactTimestamp = (fact: TCachedFile): string => {
  const frontmatter = fact.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const { date, source } = getFactDate(fact);
  if (date) {
    const formatted = date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return source === "created" ? `${formatted} • created` : formatted;
  }

  if (!frontmatter) {
    return "";
  }

  const preferred =
    getTrimmedString(frontmatter.date) ??
    getTrimmedString(frontmatter.datetime) ??
    getTrimmedString(frontmatter.date_time) ??
    getTrimmedString(frontmatter.time);

  return preferred ?? "";
};

export const FactsLinks = ({ file, config }: FactsLinksProps) => {
  const app = useApp();
  const entityType = file.cache?.frontmatter?.type as CRMEntityType | undefined;
  const hostFile = file.file;

  const linkRule = useMemo(() => {
    if (!entityType) {
      return undefined;
    }
    return FACT_LINK_RULES[entityType];
  }, [entityType]);

  const linkProperty = linkRule?.property;

  const facts = useFiles(CRMFileType.FACT, {
    filter: useCallback(
      (candidate: TCachedFile) => {
        if (!hostFile || !linkProperty) {
          return false;
        }
        if (!candidate.file || candidate.file.path === hostFile.path) {
          return false;
        }
        return matchesPropertyLink(candidate, linkProperty, hostFile);
      },
      [hostFile, linkProperty]
    ),
  });

  if (!hostFile || !entityType || !linkRule) {
    return null;
  }

  // Prepare inputs for ordering hook
  const validFacts = useMemo(
    () => facts.filter((factEntry) => Boolean(factEntry.file)),
    [facts]
  );

  const getFactId = useCallback((entry: TCachedFile) => entry.file?.path, []);

  const sortFacts = useCallback((entries: TCachedFile[]) => {
    return [...entries].sort((a, b) => {
      const infoA = getFactDate(a);
      const infoB = getFactDate(b);
      const dateA = infoA.date;
      const dateB = infoB.date;

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      if (dateA) return -1;
      if (dateB) return 1;
      const nameA = getEntityDisplayName(a).toLowerCase();
      const nameB = getEntityDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, []);

  const {
    items: orderedFacts,
    onReorder,
    sortable,
  } = useEntityLinkOrdering({
    file,
    items: validFacts,
    frontmatterKey: "facts",
    getItemId: getFactId,
    fallbackSort: sortFacts,
  });

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.facts?.collapsed === true) return true;
    if (crmState?.facts?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleReorder = onReorder;

  const handleCreateFact = useCallback(() => {
    if (!linkRule) {
      return;
    }

    void (async () => {
      try {
        await createFactForEntity({
          app,
          entityFile: file,
          linkTargets: [
            {
              property: linkRule.property,
              mode: linkRule.mode,
              target: file,
            },
          ],
        });
      } catch (error) {
        console.error("FactsLinks: failed to create fact", error);
      }
    })();
  }, [app, file, linkRule]);

  const actions = [
    {
      key: "fact-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create fact"
          onClick={handleCreateFact}
        />
      ),
    },
  ];

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;

      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {};
          }

          if (
            typeof frontmatter.crmState.facts !== "object" ||
            frontmatter.crmState.facts === null
          ) {
            frontmatter.crmState.facts = {};
          }

          frontmatter.crmState.facts.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error("FactsLinks: failed to persist collapse state", error);
      }
    },
    [app, hostFile]
  );

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="bookmark"
      title="Facts"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={orderedFacts}
        getKey={(factEntry) => factEntry.file!.path}
        sortable={sortable}
        onReorder={handleReorder}
        getSortableId={(factEntry) => factEntry.file!.path}
        pageSize={orderedFacts.length > 0 ? orderedFacts.length : undefined}
        emptyLabel="No facts yet"
        renderRow={(factEntry) => {
          const factFile = factEntry.file!;
          const label = getEntityDisplayName(factEntry);
          const timestamp = formatFactTimestamp(factEntry);

          return (
            <>
              <Table.Cell className="px-2 py-2 align-top">
                <Button to={factFile.path} variant="link">
                  {label}
                </Button>
              </Table.Cell>
              <Table.Cell className="px-2 py-2 align-top text-right text-xs text-[var(--text-muted)]">
                {timestamp || "—"}
              </Table.Cell>
            </>
          );
        }}
      />
    </Card>
  );
};

export default FactsLinks;
