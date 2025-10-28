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

    const rows = files.map<MondoEntityListRow>((cached) => {
      const { file, cache } = cached;
      const frontmatter = (cache?.frontmatter ?? {}) as Record<string, unknown>;

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
  }, [entityType, files]);

  return { columns, rows };
};

export const getDisplayValue = (
  row: MondoEntityListRow,
  column: string
): unknown => getColumnRawValue(row, column);
