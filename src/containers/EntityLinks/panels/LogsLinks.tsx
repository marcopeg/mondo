import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
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

type LogDateSource = "frontmatter" | "legacy" | "created" | null;

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseDateValue = (value: unknown): Date | null => {
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

const combineDateAndTime = (
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

const getLogDate = (log: TCachedFile): { date: Date | null; source: LogDateSource } => {
  const frontmatter = log.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  if (frontmatter) {
    const direct = parseDateValue(frontmatter.date);
    if (direct) {
      return { date: direct, source: "frontmatter" };
    }

    const combined = combineDateAndTime(frontmatter.date, frontmatter.time);
    if (combined) {
      return { date: combined, source: "legacy" };
    }

    const legacyDateTime =
      parseDateValue(frontmatter.datetime) ?? parseDateValue(frontmatter.date_time);
    if (legacyDateTime) {
      return { date: legacyDateTime, source: "legacy" };
    }
  }

  const createdAt =
    typeof log.file?.stat?.ctime === "number" ? new Date(log.file.stat.ctime) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return { date: createdAt, source: "created" };
  }

  return { date: null, source: null };
};

const formatLogTimestamp = (log: TCachedFile): string => {
  const frontmatter = log.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const { date, source } = getLogDate(log);
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
      const infoA = getLogDate(a);
      const infoB = getLogDate(b);
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

  // Logs are not manually sortable; keep a deterministic sort by timestamp desc
  const orderedLogs = useMemo(() => sortLogs(validLogs), [sortLogs, validLogs]);

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
            frontmatter.crmState = {} as any;
          }

          if (
            typeof (frontmatter as any).crmState[PANEL_STATE_KEY] !==
              "object" ||
            (frontmatter as any).crmState[PANEL_STATE_KEY] === null
          ) {
            (frontmatter as any).crmState[PANEL_STATE_KEY] = {};
          }

          (frontmatter as any).crmState[PANEL_STATE_KEY].collapsed =
            isCollapsed;
        });
      } catch (error) {
        console.error("LogsLinks: failed to persist collapse state", error);
      }
    },
    [app, hostFile]
  );

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
          // Manual reorder disabled for logs
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
        sortable={false}
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
