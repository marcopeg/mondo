import { useMemo } from "react";
import type { TFile } from "obsidian";
import { useFiles } from "@/hooks/use-files";
import { MondoFileType, getMondoEntityConfig } from "@/types/MondoFileType";

export type MondoEntityListRow = {
  path: string;
  label: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
  file: TFile;
};

const DEFAULT_COLUMN = "show";
const MAX_LINKED_PEOPLE = 5;
const MAX_LOCATION_PEOPLE = 10;

// Helper function to check if a role reference matches the given file
const matchesRoleReference = (roleValue: unknown, file: TFile): boolean => {
  const roleStr = String(roleValue).trim();
  if (roleStr.startsWith("[[") && roleStr.endsWith("]]")) {
    const inner = roleStr.slice(2, -2).split("|")[0].trim();
    return inner === file.basename || inner === file.path;
  }
  return roleStr === file.basename || roleStr === file.path;
};

const REFERENCE_KEYS = ["company", "team", "location", "linksTo"] as const;

const normalizeReferenceIdentifier = (value: string): string => {
  let normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("[[") && normalized.endsWith("]]")) {
    normalized = normalized.slice(2, -2);
  }

  normalized = normalized.split("|")[0];
  normalized = normalized.split("#")[0];
  normalized = normalized.replace(/\\/g, "/");
  normalized = normalized.replace(/\.md$/iu, "");
  normalized = normalized.replace(/^\/+/, "");

  return normalized.trim().toLowerCase();
};

const collectReferenceValues = (
  frontmatter: Record<string, unknown>
): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  REFERENCE_KEYS.forEach((key) => {
    const rawValue = frontmatter[key];
    const values = Array.isArray(rawValue)
      ? rawValue
      : rawValue !== undefined
      ? [rawValue]
      : [];

    values.forEach((entry) => {
      const stringValue = String(entry ?? "").trim();
      if (!stringValue) {
        return;
      }

      const identifier = normalizeReferenceIdentifier(stringValue);
      const dedupeKey = identifier || stringValue.toLowerCase();
      if (seen.has(dedupeKey)) {
        return;
      }

      seen.add(dedupeKey);
      results.push(stringValue);
    });
  });

  return results;
};

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const hasTimeComponent = (date: Date): boolean =>
  date.getHours() !== 0 ||
  date.getMinutes() !== 0 ||
  date.getSeconds() !== 0 ||
  date.getMilliseconds() !== 0;

const hasTimeInString = (value: string): boolean =>
  /[T\s]\d{1,2}:\d{2}/.test(value) || /\d{2}:\d{2}:\d{2}/.test(value);

type DateValueInfo = {
  date: Date | null;
  raw: string | null;
  hasTime: boolean;
};

const parseDateLikeValue = (value: unknown): DateValueInfo => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { date: null, raw: null, hasTime: false };
    }
    return {
      date: value,
      raw: value.toISOString(),
      hasTime: hasTimeComponent(value),
    };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { date: null, raw: "", hasTime: false };
    }

    const dateOnlyMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
    let parsed: Date | null = null;
    if (dateOnlyMatch) {
      const [year, month, day] = trimmed.split("-").map(Number);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day)
      ) {
        const candidate = new Date(Date.UTC(year, month - 1, day));
        parsed = Number.isNaN(candidate.getTime()) ? null : candidate;
      }
    } else {
      const candidate = new Date(trimmed);
      parsed = Number.isNaN(candidate.getTime()) ? null : candidate;
    }

    return {
      date: parsed,
      raw: trimmed,
      hasTime: hasTimeInString(trimmed),
    };
  }

  return { date: null, raw: null, hasTime: false };
};

const combineDateAndTimeValues = (
  dateValue: unknown,
  timeValue: unknown
): DateValueInfo => {
  const dateString = getTrimmedString(dateValue);
  if (!dateString) {
    return { date: null, raw: dateString ?? null, hasTime: false };
  }

  const timeString = getTrimmedString(timeValue);
  if (!timeString) {
    return { date: null, raw: dateString, hasTime: false };
  }

  const candidate = new Date(`${dateString}T${timeString}`);
  if (Number.isNaN(candidate.getTime())) {
    return {
      date: null,
      raw: `${dateString} ${timeString}`.trim(),
      hasTime: true,
    };
  }

  return {
    date: candidate,
    raw: `${dateString} ${timeString}`.trim(),
    hasTime: true,
  };
};

export type MondoEntityDateInfo = DateValueInfo & {
  source: "frontmatter" | "legacy" | "created" | null;
};

export const getDateInfoForValue = (value: unknown): DateValueInfo =>
  parseDateLikeValue(value);

export const getRowDateInfo = (row: MondoEntityListRow): MondoEntityDateInfo => {
  const frontmatter = row.frontmatter ?? {};
  const primary = parseDateLikeValue(frontmatter.date);
  const combined = combineDateAndTimeValues(frontmatter.date, frontmatter.time);

  if (primary.date) {
    if (!primary.hasTime && combined.date) {
      return { ...combined, source: "frontmatter" };
    }
    return { ...primary, source: "frontmatter" };
  }

  if (combined.date) {
    return { ...combined, source: "legacy" };
  }

  const legacyDateTime = parseDateLikeValue(frontmatter.datetime);
  if (legacyDateTime.date) {
    return { ...legacyDateTime, source: "legacy" };
  }

  const createdAt =
    typeof row.file.stat?.ctime === "number"
      ? new Date(row.file.stat.ctime)
      : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return { date: createdAt, raw: null, hasTime: true, source: "created" };
  }

  const fallbackRaw =
    (typeof frontmatter.date === "string" && frontmatter.date.trim()) ||
    (typeof frontmatter.datetime === "string" && frontmatter.datetime.trim()) ||
    combined.raw ||
    primary.raw ||
    null;

  return { date: null, raw: fallbackRaw, hasTime: false, source: null };
};

const columnRules: Partial<Record<string, (row: MondoEntityListRow) => unknown>> = {
  date: (row) => {
    const info = getRowDateInfo(row);
    return info.date ?? info.raw ?? undefined;
  },
  datetime: (row) => {
    const info = getRowDateInfo(row);
    return info.date ?? info.raw ?? undefined;
  },
  date_time: (row) => {
    const info = getRowDateInfo(row);
    return info.date ?? info.raw ?? undefined;
  },
  company_area: (row) => {
    const company = row.frontmatter?.company;
    const area = row.frontmatter?.area;
    return { company, area };
  },
  country_region: (row) => {
    const country = row.frontmatter?.country;
    const region = row.frontmatter?.region;
    return { country, region };
  },
};

const formatFrontmatterValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => formatFrontmatterValue(entry)).join(", ");
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getColumnRawValue = (row: MondoEntityListRow, column: string): unknown => {
  if (!column) return "";

  if (column === DEFAULT_COLUMN) {
    const showValue = row.frontmatter?.show;
    if (typeof showValue === "string" && showValue.trim().length > 0) {
      return showValue;
    }
    return row.label;
  }

  if (column === "fileName" || column === "filename") {
    return row.fileName;
  }

  if (column === "references") {
    return collectReferenceValues(row.frontmatter ?? {});
  }

  const columnRule = columnRules[column];
  if (columnRule) {
    const computed = columnRule(row);
    if (computed !== undefined) {
      return computed;
    }
  }

  return row.frontmatter?.[column];
};

export const useEntityPanels = (entityType: MondoFileType) => {
  const files = useFiles(entityType);
  // Conditionally fetch person files only for role, team, or location entities
  // When not needed, pass an empty type to avoid duplicate fetches
  const shouldFetchPeople = entityType === MondoFileType.ROLE || entityType === MondoFileType.TEAM || entityType === MondoFileType.LOCATION;
  // Using a dummy entity type to satisfy React hooks rules while avoiding duplicate fetch
  const allPeople = useFiles(shouldFetchPeople ? MondoFileType.PERSON : ('' as any));

  const { columns, rows } = useMemo(() => {
    const config = getMondoEntityConfig(entityType);
    const configuredColumns = config?.list?.columns?.filter((column) => column);
    const columns =
      configuredColumns && configuredColumns.length > 0
        ? configuredColumns
        : [DEFAULT_COLUMN];

    const sortColumn = (() => {
      const requested = config?.list?.sort?.column;
      if (requested && columns.includes(requested)) {
        return requested;
      }
      return columns[0];
    })();

    const sortDirection =
      config?.list?.sort?.direction === "desc" ? "desc" : "asc";

    // Check once if we need to compute people column for roles
    const shouldComputePeople = entityType === MondoFileType.ROLE && columns.includes("people");
    // Check if we need to compute members column for teams
    const shouldComputeMembers = entityType === MondoFileType.TEAM && columns.includes("members");
    // Check if we need to compute people column for locations
    const shouldComputeLocationPeople = entityType === MondoFileType.LOCATION && columns.includes("people");

    const rows = files.map<MondoEntityListRow>((cached) => {
      const { file, cache } = cached;
      const frontmatter = (cache?.frontmatter ?? {}) as Record<string, unknown>;

      const explicitTitle = frontmatter?.show;
      const baseName = file.basename ?? file.name;
      const label =
        typeof explicitTitle === "string" && explicitTitle.trim().length > 0
          ? explicitTitle
          : baseName;

      // For role entities, compute linked people (backlinks)
      const enhancedFrontmatter = { ...frontmatter };
      if (shouldComputePeople) {
        // Pre-compute person display info to avoid redundant frontmatter access
        const peopleWithNames = allPeople
          .filter((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            if (!personFm) return false;
            // Support both 'role' and 'roles' properties for consistency with PeopleTable
            const roleValue = personFm.role ?? personFm.roles;
            
            // Check if this person's role property references the current role file
            if (Array.isArray(roleValue)) {
              return roleValue.some((r) => matchesRoleReference(r, file));
            } else if (roleValue !== undefined && roleValue !== null) {
              return matchesRoleReference(roleValue, file);
            }
            return false;
          })
          .map((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            const rawShowName = personFm?.show || personFile.file.basename;
            const showName = String(rawShowName);
            const sortKey = showName.toLowerCase();
            return { personFile, showName, sortKey };
          });

        // Sort people by their show name before taking the first MAX_LINKED_PEOPLE
        const sortedPeople = peopleWithNames
          .sort((a, b) => 
            a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base", numeric: true })
          );
        
        const totalPeopleCount = sortedPeople.length;
        const linkedPeople = sortedPeople
          .slice(0, MAX_LINKED_PEOPLE) // Take only first MAX_LINKED_PEOPLE people
          .map(({ personFile, showName }) => 
            `[[${personFile.file.path}|${showName}]]`
          );
        
        // If there are more people than MAX_LINKED_PEOPLE, store the total count and role path
        // so the cell can add a "..." link to the role's page
        if (totalPeopleCount > MAX_LINKED_PEOPLE) {
          linkedPeople.push(`__MORE__:${totalPeopleCount}:${file.path}`);
        }
        
        enhancedFrontmatter.people = linkedPeople;
      }

      // For team entities, compute linked people (members who have this team in their team property)
      if (shouldComputeMembers) {
        // Pre-compute person display info to avoid redundant frontmatter access
        const membersWithNames = allPeople
          .filter((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            if (!personFm) return false;
            // Support both 'team' and 'teams' properties
            const teamValue = personFm.team ?? personFm.teams;
            
            // Check if this person's team property references the current team file
            if (Array.isArray(teamValue)) {
              return teamValue.some((t) => matchesRoleReference(t, file));
            } else if (teamValue !== undefined && teamValue !== null) {
              return matchesRoleReference(teamValue, file);
            }
            return false;
          })
          .map((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            const rawShowName = personFm?.show || personFile.file.basename;
            const showName = String(rawShowName);
            const sortKey = showName.toLowerCase();
            return { personFile, showName, sortKey };
          });

        // Sort members by their show name before taking the first MAX_LINKED_PEOPLE
        const linkedMembers = membersWithNames
          .sort((a, b) => 
            a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base", numeric: true })
          )
          .slice(0, MAX_LINKED_PEOPLE) // Take only first MAX_LINKED_PEOPLE members
          .map(({ personFile, showName }) => 
            `[[${personFile.file.path}|${showName}]]`
          );
        
        // Store the members list and whether there are more
        enhancedFrontmatter.members = linkedMembers;
        enhancedFrontmatter.members_has_more = membersWithNames.length > MAX_LINKED_PEOPLE;
      }

      // For location entities, compute linked people (people who have this location in their location property)
      if (shouldComputeLocationPeople) {
        // Pre-compute person display info to avoid redundant frontmatter access
        const peopleWithNames = allPeople
          .filter((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            if (!personFm) return false;
            // Support both 'location' and 'locations' properties
            const locationValue = personFm.location ?? personFm.locations;
            
            // Check if this person's location property references the current location file
            if (Array.isArray(locationValue)) {
              return locationValue.some((loc) => matchesRoleReference(loc, file));
            } else if (locationValue !== undefined && locationValue !== null) {
              return matchesRoleReference(locationValue, file);
            }
            return false;
          })
          .map((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            const rawShowName = personFm?.show || personFile.file.basename;
            const showName = String(rawShowName);
            const sortKey = showName.toLowerCase();
            return { personFile, showName, sortKey };
          });

        // Sort people by their show name before taking the first 10
        const sortedPeople = peopleWithNames
          .sort((a, b) => 
            a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base", numeric: true })
          );
        
        const totalPeopleCount = sortedPeople.length;
        const linkedPeople = sortedPeople
          .slice(0, MAX_LOCATION_PEOPLE) // Take first MAX_LOCATION_PEOPLE people for locations
          .map(({ personFile }) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            return {
              path: personFile.file.path,
              cover: personFm?.cover || null,
            };
          });
        
        // Store the people list with more info
        enhancedFrontmatter.people = linkedPeople;
        enhancedFrontmatter.people_has_more = totalPeopleCount > MAX_LOCATION_PEOPLE;
        enhancedFrontmatter.people_total = totalPeopleCount;
      }

      return {
        path: file.path,
        label,
        fileName: baseName,
        frontmatter: enhancedFrontmatter,
        file,
      };
    });

    rows.sort((a, b) => {
      const rawA = getColumnRawValue(a, sortColumn);
      const rawB = getColumnRawValue(b, sortColumn);
      const valueA = formatFrontmatterValue(rawA).toLowerCase();
      const valueB = formatFrontmatterValue(rawB).toLowerCase();
      const comparison = valueA.localeCompare(valueB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return { columns, rows };
  }, [entityType, files, allPeople]);

  return { columns, rows };
};

export const getDisplayValue = (
  row: MondoEntityListRow,
  column: string
): unknown => getColumnRawValue(row, column);
