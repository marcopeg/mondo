import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { Typography } from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
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
    property: "parent",
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
    const candidate = typeof timeValue === "string"
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

  const sortedFacts = useMemo(() => {
    return [...facts].sort((a, b) => {
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
  }, [facts]);

  const entityName = getEntityDisplayName(file);
  const subtitle = linkRule.subtitle(entityName);

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

  const factCount = sortedFacts.length;
  const actions = [
    {
      key: "fact-count",
      content: (
        <Badge
          aria-label={`${factCount} fact${factCount === 1 ? "" : "s"}`}
        >
          {factCount}
        </Badge>
      ),
    },
    {
      key: "fact-create",
      content: (
        <Button variant="link" icon="plus" onClick={handleCreateFact}>
          + New Fact
        </Button>
      ),
    },
  ];

  const hasFacts = sortedFacts.length > 0;

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="bookmark"
      title="Facts"
      subtitle={subtitle}
      actions={actions}
      {...(!hasFacts ? { p: 0 } : {})}
    >
      {hasFacts ? (
        <Stack direction="column" gap={2}>
          {sortedFacts.map((fact) => {
            const factFile = fact.file;
            if (!factFile) {
              return null;
            }

            const label = getEntityDisplayName(fact);
            const timestamp = formatFactTimestamp(fact);

            return (
              <div
                key={factFile.path}
                className="rounded-sm border border-transparent p-2 hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]"
              >
                <Stack direction="column" gap={1}>
                  <Link
                    to={factFile.path}
                    className="text-sm font-medium text-[var(--text-accent)] hover:underline"
                  >
                    {label}
                  </Link>
                  {timestamp && (
                    <Typography variant="muted" className="text-xs">
                      {timestamp}
                    </Typography>
                  )}
                </Stack>
              </div>
            );
          })}
        </Stack>
      ) : null}
    </Card>
  );
};

export default FactsLinks;
