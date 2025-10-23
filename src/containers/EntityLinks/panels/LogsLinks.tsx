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
import { createLogForEntity } from "@/utils/createLogForEntity";
import type { TCachedFile } from "@/types/TCachedFile";

const PANEL_STATE_KEY = "logs";
const PAGE_SIZE = 5;

type LogsLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

type LogLinkRule = {
  property: string;
  mode: "single" | "list";
  subtitle: (entityName: string) => string;
};

const createDefaultSubtitle = (entityType: CRMEntityType) => {
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  return (name: string) =>
    name ? `Logs referencing ${name}` : `Logs related to this ${entityLabel}`;
};

const SPECIAL_LOG_RULES: Partial<Record<CRMEntityType, LogLinkRule>> = {
  person: {
    property: "participants",
    mode: "list",
    subtitle: (name) =>
      name ? `Logs referencing ${name}` : "Logs referencing this person",
  },
  meeting: {
    property: "meeting",
    mode: "single",
    subtitle: () => "Logs related to this meeting",
  },
  fact: {
    property: "fact",
    mode: "single",
    subtitle: (name) =>
      name ? `Logs referencing ${name}` : "Logs related to this fact",
  },
};

const resolveLogLinkRule = (entityType: CRMEntityType): LogLinkRule =>
  SPECIAL_LOG_RULES[entityType] ?? {
    property: entityType,
    mode: "single",
    subtitle: createDefaultSubtitle(entityType),
  };

const getLogDate = (log: TCachedFile): Date | null => {
  const frontmatter = log.cache?.frontmatter as
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

const formatLogTimestamp = (log: TCachedFile): string => {
  const frontmatter = log.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const dated = getLogDate(log);
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

export const LogsLinks = ({ file, config }: LogsLinksProps) => {
  const app = useApp();
  const entityType = file.cache?.frontmatter?.type as CRMEntityType | undefined;
  const hostFile = file.file;

  if (!hostFile || !entityType) {
    return null;
  }

  const linkRule = resolveLogLinkRule(entityType);
  const linkProperty = linkRule.property;

  const logs = useFiles(CRMFileType.LOG, {
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

  const validLogs = useMemo(
    () => logs.filter((entry) => Boolean(entry.file)),
    [logs]
  );

  const getLogId = useCallback((entry: TCachedFile) => entry.file?.path, []);

  const sortLogs = useCallback((entries: TCachedFile[]) => {
    return [...entries].sort((a, b) => {
      const dateA = getLogDate(a);
      const dateB = getLogDate(b);

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
    items: orderedLogs,
    onReorder,
    sortable,
  } = useEntityLinkOrdering({
    file,
    items: validLogs,
    frontmatterKey: PANEL_STATE_KEY,
    getItemId: getLogId,
    fallbackSort: sortLogs,
  });

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.[PANEL_STATE_KEY]?.collapsed === true) return true;
    if (crmState?.[PANEL_STATE_KEY]?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

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
            typeof frontmatter.crmState[PANEL_STATE_KEY] !== "object" ||
            frontmatter.crmState[PANEL_STATE_KEY] === null
          ) {
            frontmatter.crmState[PANEL_STATE_KEY] = {};
          }

          frontmatter.crmState[PANEL_STATE_KEY].collapsed = isCollapsed;
        });
      } catch (error) {
        console.error("LogsLinks: failed to persist collapse state", error);
      }
    },
    [app, hostFile]
  );

  const handleReorder = onReorder;

  // Removed subtitle to keep header clean per request

  const handleCreateLog = useCallback(() => {
    void (async () => {
      try {
        await createLogForEntity({
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
        console.error("LogsLinks: failed to create log", error);
      }
    })();
  }, [app, file, linkRule]);

  const actions = [
    {
      key: "log-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create log"
          onClick={handleCreateLog}
        />
      ),
    },
  ];

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="file-clock"
      title="Logs"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={orderedLogs}
        getKey={(logEntry) => logEntry.file!.path}
        sortable={sortable}
        onReorder={handleReorder}
        getSortableId={(logEntry) => logEntry.file!.path}
        pageSize={PAGE_SIZE}
        emptyLabel="No logs yet"
        renderRow={(logEntry) => {
          const logFile = logEntry.file!;
          const label = getEntityDisplayName(logEntry);
          const timestamp = formatLogTimestamp(logEntry);

          return (
            <>
              <Table.Cell className="px-2 py-2 align-top">
                <Button to={logFile.path} variant="link">
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

export default LogsLinks;
