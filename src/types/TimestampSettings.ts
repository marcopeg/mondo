import type { Moment } from "moment";

export type TimestampSettings = {
  template: string;
  appendNewLine: boolean;
};

type LegacyTimestampSettings = TimestampSettings & {
  dateFormat?: string;
  timeFormat?: string;
  separator?: string;
};

const LEGACY_DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
const LEGACY_DEFAULT_TIME_FORMAT = "HH:mm";
const LEGACY_DEFAULT_SEPARATOR = " ";

export const DEFAULT_TIMESTAMP_SETTINGS: TimestampSettings = {
  template: "YYYY-MM-DD HH:mm",
  appendNewLine: true,
};

const sanitizeString = (
  value: unknown,
  fallback: string,
  options?: { preserveWhitespace?: boolean }
): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (options?.preserveWhitespace) {
    return value;
  }

  return trimmed;
};

const convertLegacyTemplate = (
  template: string,
  source: LegacyTimestampSettings
): string => {
  const containsLegacyPlaceholders = /\{\{\s*(date|time|separator)\s*\}\}/i.test(
    template
  );

  if (!containsLegacyPlaceholders) {
    return template;
  }

  const dateFormat = sanitizeString(
    source.dateFormat,
    LEGACY_DEFAULT_DATE_FORMAT
  );
  const timeFormat = sanitizeString(
    source.timeFormat,
    LEGACY_DEFAULT_TIME_FORMAT
  );
  const separator =
    typeof source.separator === "string"
      ? source.separator
      : LEGACY_DEFAULT_SEPARATOR;

  return template
    .replace(/\{\{\s*date\s*\}\}/gi, dateFormat)
    .replace(/\{\{\s*time\s*\}\}/gi, timeFormat)
    .replace(/\{\{\s*separator\s*\}\}/gi, separator);
};

export const normalizeTimestampSettings = (
  raw: unknown
): TimestampSettings => {
  const source = (raw ?? {}) as LegacyTimestampSettings;

  const template = convertLegacyTemplate(
    sanitizeString(source.template, DEFAULT_TIMESTAMP_SETTINGS.template, {
      preserveWhitespace: true,
    }),
    source
  );
  const appendNewLine =
    typeof source.appendNewLine === "boolean"
      ? source.appendNewLine
      : DEFAULT_TIMESTAMP_SETTINGS.appendNewLine;

  return {
    template,
    appendNewLine,
  };
};

export const buildTimestampFromMoment = (
  options: {
    moment: Moment;
    settings: TimestampSettings;
    includeTrailingNewLine?: boolean;
  }
): string => {
  const { moment, settings } = options;
  const includeTrailingNewLine = options.includeTrailingNewLine ?? false;

  const format = settings.template
    .replace(/\[/g, "[[]")
    .replace(/\]/g, "[]]");

  const result = moment.format(format);
  return includeTrailingNewLine && settings.appendNewLine
    ? `${result}\n`
    : result;
};
