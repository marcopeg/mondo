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

const getFactDate = (fact: TCachedFile): Date | null => {
  const frontmatter = fact.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!frontmatter) {
    return null;
  }

  const datetime = frontmatter.datetime;
  if (typeof datetime === "string") {
    const parsed = new Date(datetime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const dateValue = frontmatter.date;
  const timeValue = frontmatter.time;

  if (typeof dateValue === "string") {
    const candidate =
      typeof timeValue === "string"
        ? new Date(`${dateValue}T${timeValue}`)
        : new Date(dateValue);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  return null;
};

const formatFactTimestamp = (fact: TCachedFile): string => {
  const frontmatter = fact.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const dated = getFactDate(fact);
  if (dated) {
    return dated.toLocaleString();
  }

  if (!frontmatter) {
    return "";
  }

  if (typeof frontmatter.datetime === "string") {
    return frontmatter.datetime;
  }

  const parts: string[] = [];
  if (typeof frontmatter.date === "string") {
    parts.push(frontmatter.date);
  }
  if (typeof frontmatter.time === "string") {
    parts.push(frontmatter.time);
  }

  return parts.join(" ");
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
      const dateA = getFactDate(a);
      const dateB = getFactDate(b);

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
