import { useMemo } from "react";
import type { TFile } from "obsidian";
import { useFiles } from "@/hooks/use-files";
import { MondoFileType, getMondoEntityConfig } from "@/types/MondoFileType";
import type { MondoEntityListColumnDefinition } from "@/types/MondoEntityConfig";

export type MondoEntityListRow = {
  path: string;
  label: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
  file: TFile;
};

export type MondoEntityListColumn = MondoEntityListColumnDefinition & {
  key: string;
  label: string;
};

const DEFAULT_COLUMN_DEFINITION: MondoEntityListColumnDefinition = {
  type: "title",
  prop: "show",
  key: "show",
};
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

const formatColumnLabel = (column: string): string =>
  column
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeColumn = (
  definition: MondoEntityListColumnDefinition
): MondoEntityListColumn => {
  if (definition.type === "cover") {
    const prop = definition.prop ?? "cover";
    const key = definition.key ?? prop ?? "cover";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  if (definition.type === "title") {
    const prop = definition.prop ?? "show";
    const key = definition.key ?? prop;
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  if (definition.type === "date") {
    const prop = definition.prop ?? "date";
    const key = definition.key ?? prop ?? "date";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  if (definition.type === "value") {
    const key = definition.key ?? definition.prop;
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, key, label };
  }

  if (definition.type === "link") {
    const key = definition.key ?? definition.prop;
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, key, label };
  }

  if (definition.type === "companyArea") {
    const companyProp = definition.companyProp ?? "company";
    const areaProp = definition.areaProp ?? "area";
    const key = definition.key ?? "company_area";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, companyProp, areaProp, key, label };
  }

  if (definition.type === "countryRegion") {
    const countryProp = definition.countryProp ?? "country";
    const regionProp = definition.regionProp ?? "region";
    const key = definition.key ?? "country_region";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, countryProp, regionProp, key, label };
  }

  if (definition.type === "members") {
    const prop = definition.prop ?? "members";
    const key = definition.key ?? "members";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  if (definition.type === "locationPeople") {
    const prop = definition.prop ?? "people";
    const key = definition.key ?? "people";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  if (definition.type === "url") {
    const prop = definition.prop ?? "url";
    const key = definition.key ?? prop ?? "url";
    const label = definition.label ?? formatColumnLabel(key);
    return { ...definition, prop, key, label };
  }

  const exhaustiveCheck: never = definition;
  throw new Error(`Unsupported column type: ${exhaustiveCheck}`);
};

const normalizeColumns = (
  definitions: MondoEntityListColumnDefinition[] | undefined
): MondoEntityListColumn[] =>
  Array.isArray(definitions)
    ? definitions.map((definition) => normalizeColumn(definition))
    : [];

const stringifySortValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => stringifySortValue(entry)).join(", ");
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getTitleValue = (row: MondoEntityListRow, prop: string): string => {
  const frontmatterValue = row.frontmatter?.[prop];
  if (typeof frontmatterValue === "string") {
    const trimmed = frontmatterValue.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (prop !== "show") {
    const showValue = row.frontmatter?.show;
    if (typeof showValue === "string") {
      const trimmed = showValue.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return row.label;
};

export const getColumnValue = (
  row: MondoEntityListRow,
  column: MondoEntityListColumn
): unknown => {
  const frontmatter = row.frontmatter ?? {};

  switch (column.type) {
    case "title":
      return getTitleValue(row, column.prop ?? "show");
    case "cover":
      return frontmatter[column.prop ?? "cover"];
    case "value":
      return frontmatter[column.prop];
    case "link":
      if (column.prop === "references") {
        return collectReferenceValues(frontmatter);
      }
      return frontmatter[column.prop];
    case "companyArea":
      return {
        company: frontmatter[column.companyProp ?? "company"],
        area: frontmatter[column.areaProp ?? "area"],
      };
    case "countryRegion":
      return {
        country: frontmatter[column.countryProp ?? "country"],
        region: frontmatter[column.regionProp ?? "region"],
      };
    case "members":
      return frontmatter[column.prop ?? "members"];
    case "locationPeople":
      return frontmatter[column.prop ?? "people"];
    case "url":
      return frontmatter[column.prop ?? "url"];
    case "date": {
      const prop = column.prop ?? "date";
      if (prop === "date" || prop === "date_time" || prop === "datetime") {
        const info = getRowDateInfo(row);
        return info.date ?? info.raw ?? undefined;
      }
      return frontmatter[prop];
    }
    default: {
      const exhaustiveCheck: never = column;
      void exhaustiveCheck;
      return undefined;
    }
  }
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
    const configuredColumns = normalizeColumns(config?.list?.columns);
    const columns =
      configuredColumns.length > 0
        ? configuredColumns
        : [normalizeColumn(DEFAULT_COLUMN_DEFINITION)];

    const sortColumnDefinition = (() => {
      const requestedKey = config?.list?.sort?.column;
      if (!requestedKey) {
        return columns[0];
      }

      const byKey = columns.find((column) => column.key === requestedKey);
      if (byKey) {
        return byKey;
      }

      const byProp = columns.find((column) => {
        if (column.type === "companyArea" || column.type === "countryRegion") {
          return column.key === requestedKey;
        }

        if ("prop" in column) {
          return column.prop === requestedKey;
        }

        return false;
      });

      return byProp ?? columns[0];
    })();

    const sortDirection =
      config?.list?.sort?.direction === "desc" ? "desc" : "asc";

    const shouldComputePeople =
      entityType === MondoFileType.ROLE &&
      columns.some(
        (column) => column.type === "link" && column.prop === "people"
      );
    const shouldComputeMembers =
      entityType === MondoFileType.TEAM &&
      columns.some((column) => column.type === "members");
    const shouldComputeLocationPeople =
      entityType === MondoFileType.LOCATION &&
      columns.some((column) => column.type === "locationPeople");

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

      // For location entities, compute linked people (those who have this location in their location property)
      if (shouldComputeLocationPeople) {
        const peopleWithInfo = allPeople
          .filter((personFile) => {
            const personFm = personFile.cache?.frontmatter as Record<string, unknown> | undefined;
            if (!personFm) return false;
            const locationValue = personFm.location;
            
            // Check if this person's location property references the current location file
            if (Array.isArray(locationValue)) {
              return locationValue.some((l) => matchesRoleReference(l, file));
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
            
            // Check if person has a cover image
            const coverValue = personFm?.cover;
            const hasCover = Boolean(coverValue);
            
            return { personFile, showName, sortKey, hasCover };
          })
          .sort((a, b) => 
            a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base", numeric: true })
          );

        // Take the first MAX_LOCATION_PEOPLE people alphabetically
        const firstPeople = peopleWithInfo.slice(0, MAX_LOCATION_PEOPLE);
        
        // Mark those with covers
        const linkedPeople = firstPeople.map(({ personFile, showName, hasCover }) => 
          `[[${personFile.file.path}|${showName}]]${hasCover ? '|HAS_COVER' : ''}`
        );
        
        enhancedFrontmatter.people = linkedPeople;
        enhancedFrontmatter.people_has_more = peopleWithInfo.length > MAX_LOCATION_PEOPLE;
        enhancedFrontmatter.people_total = peopleWithInfo.length;
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
      const rawA = getColumnValue(a, sortColumnDefinition);
      const rawB = getColumnValue(b, sortColumnDefinition);
      const valueA = stringifySortValue(rawA).toLowerCase();
      const valueB = stringifySortValue(rawB).toLowerCase();
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
