import React from "react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useApp } from "@/hooks/use-app";
import type { TCachedFile } from "@/types/TCachedFile";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { ReadableDate } from "@/components/ui/ReadableDate";

type MeetingsTableProps = {
  items: TCachedFile[];
  emptyLabel?: React.ReactNode;
};

type ResolvedFrontmatterLink = { path: string | null; label: string };

const normalizeFrontmatterValues = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
};

const resolveFrontmatterLink = (
  rawValue: string,
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): ResolvedFrontmatterLink => {
  if (!rawValue) {
    return { path: null, label: "" };
  }

  let value = rawValue;
  if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
  }
  value = value.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();

  if (!value) {
    return { path: null, label: rawValue };
  }

  const destination = app.metadataCache.getFirstLinkpathDest(
    value,
    entry.file.path
  );
  if (destination && (destination as any).path) {
    return {
      path: (destination as any).path as string,
      label: ((destination as any).basename as string) ?? value,
    };
  }

  const absolute = app.vault.getAbstractFileByPath(value) as any;
  if (absolute && absolute.path) {
    return { path: absolute.path as string, label: absolute.basename ?? value };
  }

  const absoluteWithExtension = app.vault.getAbstractFileByPath(
    `${value}.md`
  ) as any;
  if (absoluteWithExtension && absoluteWithExtension.path) {
    return {
      path: absoluteWithExtension.path as string,
      label: absoluteWithExtension.basename ?? value,
    };
  }

  return { path: null, label: value };
};

const resolveFrontmatterLinks = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>,
  keys: string[]
): ResolvedFrontmatterLink[] => {
  const frontmatter = entry.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!frontmatter) {
    return [];
  }

  const seen = new Set<string>();

  return keys
    .flatMap((key) => normalizeFrontmatterValues(frontmatter[key]))
    .map((value) => resolveFrontmatterLink(value, entry, app))
    .filter((item) => {
      const identifier = item.path ?? item.label;
      if (!identifier) {
        return false;
      }
      if (seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
    });
};

const resolveParticipants = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): ResolvedFrontmatterLink[] => {
  return resolveFrontmatterLinks(entry, app, ["participants"]);
};

const resolveReferences = (
  entry: TCachedFile,
  app: ReturnType<typeof useApp>
): ResolvedFrontmatterLink[] => {
  return resolveFrontmatterLinks(entry, app, [
    "company",
    "team",
    "location",
    "linksTo",
  ]);
};

const parseMeetingDateValue = (
  value: unknown
): { date: Date | null; raw: string | null } => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { date: null, raw: null }
      : { date: value, raw: value.toISOString() };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { date: null, raw: null };
    }

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return { date: direct, raw: trimmed };
    }

    const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00`;
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) {
      return { date: fallback, raw: trimmed };
    }

    return { date: null, raw: trimmed };
  }

  return { date: null, raw: null };
};

type MeetingDateInfo = {
  value: Date | string | number;
  fallback?: string | null;
  suffix?: "created";
};

const getMeetingDateInfo = (entry: TCachedFile): MeetingDateInfo | null => {
  const frontmatter = entry.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const candidate = parseMeetingDateValue(frontmatter?.date);
  if (candidate.date) {
    return { value: candidate.date, fallback: candidate.raw };
  }

  if (candidate.raw) {
    return { value: candidate.raw, fallback: candidate.raw };
  }

  const createdAt =
    typeof entry.file.stat?.ctime === "number"
      ? new Date(entry.file.stat.ctime)
      : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return { value: createdAt, suffix: "created" };
  }

  return null;
};

/**
 * Presentational table for meeting rows with Obsidian link resolution for participants.
 */
export const MeetingsTable: React.FC<MeetingsTableProps> = ({
  items,
  emptyLabel,
}) => {
  const app = useApp();

  return (
    <EntityLinksTable
      items={items}
      getKey={(entry) => entry.file.path}
      emptyLabel={emptyLabel}
      renderRow={(entry) => {
        const label =
          entry.cache?.frontmatter?.title ??
          entry.cache?.frontmatter?.name ??
          entry.file.basename ??
          entry.file.path;
        const meetingDate = getMeetingDateInfo(entry);

        const showLabel =
          entry.cache?.frontmatter?.show ??
          entry.file.basename ??
          entry.file.path;

        const participants = resolveParticipants(entry, app);
        const references = resolveReferences(entry, app);

        return (
          <>
            <Table.Cell className="px-2 py-2 align-top">
              <Button to={entry.file.path} variant="link">
                {label}
              </Button>
              {(meetingDate || showLabel) && (
                <div className="mt-1 space-y-1 text-xs text-[var(--text-muted)]">
                  {meetingDate ? (
                    <div>
                      <ReadableDate
                        value={meetingDate.value}
                        fallback={meetingDate.fallback ?? "—"}
                        extraHint={
                          meetingDate.suffix === "created"
                            ? "Created from file metadata"
                            : null
                        }
                      />
                      {meetingDate.suffix === "created" ? (
                        <span className="ml-1">• created</span>
                      ) : null}
                    </div>
                  ) : null}
                  {showLabel ? <div>{showLabel}</div> : null}
                </div>
              )}
            </Table.Cell>
            <Table.Cell className="px-2 py-2 align-top text-xs text-[var(--text-muted)]">
              {references.length > 0 ? (
                references.map((reference, index) => (
                  <React.Fragment key={`${reference.label}-${index}`}>
                    {reference.path ? (
                      <Button
                        to={reference.path}
                        variant="link"
                        className="text-xs"
                      >
                        {reference.label}
                      </Button>
                    ) : (
                      <span className="text-xs">{reference.label}</span>
                    )}
                    {index < references.length - 1 ? ", " : null}
                  </React.Fragment>
                ))
              ) : (
                <span>—</span>
              )}
            </Table.Cell>
            <Table.Cell className="px-2 py-2 align-top text-xs text-[var(--text-muted)]">
              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <React.Fragment key={`${participant.label}-${index}`}>
                    {participant.path ? (
                      <Button
                        to={participant.path}
                        variant="link"
                        className="text-xs"
                      >
                        {participant.label}
                      </Button>
                    ) : (
                      <span className="text-xs">{participant.label}</span>
                    )}
                    {index < participants.length - 1 ? ", " : null}
                  </React.Fragment>
                ))
              ) : (
                <span>—</span>
              )}
            </Table.Cell>
          </>
        );
      }}
    />
  );
};

export default MeetingsTable;
