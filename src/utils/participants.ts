import type { App, TFile } from "obsidian";

/**
 * Normalize a participants entry to compare equality regardless of display alias or extension.
 */
export const normalizeParticipantLink = (raw: string): string => {
  let link = raw.trim();
  if (!link) {
    return "";
  }
  if (link.startsWith("[[") && link.endsWith("]]")) {
    link = link.slice(2, -2);
  }
  link = link.split("|")[0];
  link = link.replace(/\\/g, "/");
  link = link.replace(/\.md$/iu, "");
  link = link.replace(/^\/+/, "");
  return link.trim();
};

/**
 * Parse the participants frontmatter field into an array of strings.
 */
export const parseParticipants = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  const single = String(value).trim();
  return single ? [single] : [];
};

/**
 * Ensure a participant link exists on the provided file frontmatter.
 * Returns true if the participant list was updated or already contained the link.
 */
export const addParticipantLink = async (
  app: App,
  file: TFile,
  link: string
): Promise<boolean> => {
  const normalizedLink = normalizeParticipantLink(link);
  if (!normalizedLink) {
    return false;
  }

  let updated = false;
  await app.fileManager.processFrontMatter(file, (fm) => {
    const existing = parseParticipants((fm as Record<string, unknown>).link);
    const hasLink = existing.some(
      (value) => normalizeParticipantLink(String(value)) === normalizedLink
    );
    if (hasLink) {
      fm.link = existing.length > 0 ? existing : [link];
      updated = true;
      return;
    }
    fm.link = [...existing, link];
    updated = true;
  });

  return updated;
};
