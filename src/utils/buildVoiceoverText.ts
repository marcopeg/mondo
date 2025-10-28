import type { TFile } from "obsidian";

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseFrontmatterDate = (
  value: unknown
): { date: Date | null; raw: string | null } => {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return { date: value, raw: value.toISOString() };
    }
    return { date: null, raw: null };
  }

  const raw = getTrimmedString(value);
  if (!raw) {
    return { date: null, raw: null };
  }

  const primary = new Date(raw);
  if (!Number.isNaN(primary.getTime())) {
    return { date: primary, raw };
  }

  const normalized = raw.includes("T") ? raw : `${raw}T00:00`;
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return { date: fallback, raw };
  }

  return { date: null, raw };
};

const hasTimeComponent = (value: Date | string | null): boolean => {
  if (!value) return false;
  if (value instanceof Date) {
    return (
      value.getHours() !== 0 ||
      value.getMinutes() !== 0 ||
      value.getSeconds() !== 0
    );
  }
  return /\d{1,2}:\d{2}/.test(value);
};

const formatDateForNarration = (date: Date, includeTime: boolean): string => {
  const options: Intl.DateTimeFormatOptions = includeTime
    ? {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    : {
        year: "numeric",
        month: "long",
        day: "numeric",
      };

  return date.toLocaleString("en-US", options);
};

const getNoteDateInfo = (
  file: TFile,
  frontmatter: Record<string, unknown>
): string => {
  const candidates: Array<{ date: Date | null; raw: string | null }> = [
    parseFrontmatterDate(frontmatter.date),
    parseFrontmatterDate(frontmatter.published),
    parseFrontmatterDate(frontmatter.created),
  ];

  for (const candidate of candidates) {
    if (candidate.date) {
      const includeTime = hasTimeComponent(candidate.date) || hasTimeComponent(candidate.raw);
      const formatted = formatDateForNarration(candidate.date, includeTime);
      return `on ${formatted}`;
    }
    if (candidate.raw) {
      return `on ${candidate.raw}`;
    }
  }

  const stat = file.stat;
  if (stat?.ctime) {
    const created = new Date(stat.ctime);
    if (!Number.isNaN(created.getTime())) {
      const formatted = formatDateForNarration(created, true);
      return `created on ${formatted}`;
    }
  }

  return "";
};

export const buildVoiceoverText = (
  fileContent: string,
  file: TFile,
  selectedText: string | null = null
): string => {
  // If there's selected text, just use that
  if (selectedText && selectedText.trim()) {
    return selectedText.trim();
  }

  // Parse the file content to extract frontmatter and body
  const frontmatterMatch = fileContent.match(
    /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  );

  let frontmatterStr = "";
  let bodyContent = fileContent;

  if (frontmatterMatch) {
    frontmatterStr = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2];
  }

  // Parse YAML frontmatter
  let frontmatter: Record<string, unknown> = {};
  if (frontmatterStr) {
    try {
      frontmatter = parseFrontmatter(frontmatterStr);
    } catch (error) {
      console.warn("Mondo: failed to parse frontmatter", error);
    }
  }

  // Build the voiceover text
  const parts: string[] = [];

  // 1. File title - use "show" if available, otherwise filename
  const title = frontmatter.show ?? file.basename;
  parts.push(`${title}.`);

  // 2. Add date information
  const dateInfo = getNoteDateInfo(file, frontmatter);
  if (dateInfo) {
    parts.push(dateInfo);
  }

  // 3. Pause before content
  if (bodyContent.trim()) {
    parts.push(".");
  }

  // 4. Body content
  if (bodyContent.trim()) {
    parts.push(bodyContent.trim());
  }

  return parts.join("\n\n");
};

const parseFrontmatter = (frontmatterStr: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const lines = frontmatterStr.split("\n");

  let currentKey = "";
  let currentValue: string[] = [];

  for (const line of lines) {
    // Match key: value pattern
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);

    if (match) {
      // Save previous key-value pair
      if (currentKey) {
        result[currentKey] = parseYamlValue(currentValue.join("\n"));
      }

      currentKey = match[1];
      currentValue = [match[2]];
    } else if (currentKey && line.match(/^\s+/)) {
      // Continuation of previous value (list or multiline)
      currentValue.push(line);
    }
  }

  // Save last key-value pair
  if (currentKey) {
    result[currentKey] = parseYamlValue(currentValue.join("\n"));
  }

  return result;
};

const parseYamlValue = (value: string): unknown => {
  const trimmed = value.trim();

  // Handle empty values
  if (!trimmed) {
    return null;
  }

  // Handle booleans
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Handle numbers
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Handle quoted strings
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Default to string
  return trimmed;
};
