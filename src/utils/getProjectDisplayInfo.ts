import type { TCachedFile } from "@/types/TCachedFile";

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const getProjectDisplayLabel = (project: TCachedFile): string => {
  const frontmatter = project.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const name = frontmatter?.name;
  if (isNonEmptyString(name)) {
    return name.trim();
  }

  const file = project.file;
  if (file?.basename) {
    return file.basename;
  }

  return file?.path ?? "";
};

export const getProjectDisplaySubtitle = (
  project: TCachedFile
): string | undefined => {
  const frontmatter = project.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  if (!frontmatter) {
    return undefined;
  }

  const raw = frontmatter.subtitle ?? frontmatter.description;

  if (isNonEmptyString(raw)) {
    return raw.trim();
  }

  if (raw === null || typeof raw === "undefined") {
    return undefined;
  }

  return String(raw);
};
