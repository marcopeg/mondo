import type { TFile } from "obsidian";

const getNoteDateInfo = (
  file: TFile,
  frontmatter: Record<string, unknown>
): string => {
  // Try to get date from frontmatter
  const fmDate =
    frontmatter.date ?? frontmatter.published ?? frontmatter.created;
  const fmTime = frontmatter.time;

  if (fmDate) {
    const dateStr = typeof fmDate === "string" ? fmDate : String(fmDate);
    const timeStr = fmTime
      ? typeof fmTime === "string"
        ? fmTime
        : String(fmTime)
      : null;

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const formatted = date.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `on ${formatted}`;
      }
    } catch {
      // If date parsing fails, try with just the string
      if (timeStr) {
        return `on ${dateStr} at ${timeStr}`;
      }
      return `on ${dateStr}`;
    }
  }

  // Fallback to file creation time
  const stat = file.stat;
  if (stat?.ctime) {
    const date = new Date(stat.ctime);
    const formatted = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `created on ${formatted}`;
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
      console.warn("CRM: failed to parse frontmatter", error);
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
