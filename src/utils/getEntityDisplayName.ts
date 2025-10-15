import type { TCachedFile } from "@/types/TCachedFile";

/**
 * Returns a human friendly display name for an entity cached file.
 */
export const getEntityDisplayName = (file: TCachedFile): string => {
  const frontmatter = file.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const show = typeof frontmatter?.show === "string" ? frontmatter.show.trim() : "";
  if (show) {
    return show;
  }

  const name = typeof frontmatter?.name === "string" ? frontmatter.name.trim() : "";
  if (name) {
    return name;
  }

  return file.file?.basename ?? "Untitled";
};

export default getEntityDisplayName;
