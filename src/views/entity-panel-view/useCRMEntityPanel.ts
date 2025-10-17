import { useMemo } from "react";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";

export type CRMEntityListRow = {
  path: string;
  label: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
};

const DEFAULT_COLUMN = "show";

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toDateObject = (dateValue: unknown, timeValue?: unknown): Date | null => {
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const dateString = getTrimmedString(dateValue);
  if (!dateString) return null;

  const timeString = getTrimmedString(timeValue);
  const hasExplicitTime = dateString.includes("T") || dateString.includes(" ");
  const isoCandidate =
    timeString && !hasExplicitTime
      ? `${dateString}T${timeString}`
      : dateString.includes("T")
        ? dateString
        : `${dateString}T00:00`;

  const parsed = new Date(isoCandidate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(dateString);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const columnRules: Partial<Record<string, (row: CRMEntityListRow) => unknown>> = {
  date_time: (row) => {
    const frontmatter = row.frontmatter ?? {};
    const parsed = toDateObject(frontmatter.date, frontmatter.time);
    if (parsed) {
      return parsed;
    }

    const fallback = frontmatter.date_time;
    if (fallback instanceof Date) {
      return Number.isNaN(fallback.getTime()) ? undefined : fallback;
    }
    if (typeof fallback === "string") {
      const fallbackParsed = toDateObject(fallback);
      if (fallbackParsed) {
        return fallbackParsed;
      }
      const trimmed = fallback.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
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

const getColumnRawValue = (
  row: CRMEntityListRow,
  column: string
): unknown => {
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

  const columnRule = columnRules[column];
  if (columnRule) {
    const computed = columnRule(row);
    if (computed !== undefined) {
      return computed;
    }
  }

  return row.frontmatter?.[column];
};

export const useCRMEntityPanel = (entityType: CRMFileType) => {
  const files = useFiles(entityType);

  const { columns, rows } = useMemo(() => {
    const config = getCRMEntityConfig(entityType);
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

    const rows = files.map<CRMEntityListRow>((cached) => {
      const { file, cache } = cached;
      const frontmatter = (cache?.frontmatter ?? {}) as Record<
        string,
        unknown
      >;

      const explicitTitle = frontmatter?.show;
      const baseName = file.basename ?? file.name;
      const label =
        typeof explicitTitle === "string" && explicitTitle.trim().length > 0
          ? explicitTitle
          : baseName;

      return {
        path: file.path,
        label,
        fileName: baseName,
        frontmatter,
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
  }, [entityType, files]);

  return { columns, rows };
};

export const getDisplayValue = (
  row: CRMEntityListRow,
  column: string
): unknown => getColumnRawValue(row, column);
