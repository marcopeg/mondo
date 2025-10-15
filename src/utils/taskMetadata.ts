import type { TCachedFile } from "@/types/TCachedFile";

export const getTaskLabel = (task: TCachedFile): string => {
  const frontmatter = task.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  const show =
    typeof frontmatter?.show === "string" ? frontmatter.show.trim() : "";
  if (show) {
    return show;
  }
  return task.file?.basename ?? "Untitled task";
};

export const getTaskStatus = (task: TCachedFile): string | null => {
  const frontmatter = task.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  const status =
    typeof frontmatter?.status === "string" ? frontmatter.status.trim() : "";
  return status.length > 0 ? status : null;
};

export default { getTaskLabel, getTaskStatus };
