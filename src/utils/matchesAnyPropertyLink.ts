import type { TFile } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";
import { matchesPropertyLink } from "./matchesPropertyLink";

/**
 * Returns true if any of the provided frontmatter property keys on the candidate
 * file references the target file.
 */
export const matchesAnyPropertyLink = (
  candidate: TCachedFile,
  propertyKeys: string[],
  target: TFile
): boolean => {
  if (propertyKeys.length === 0) {
    return false;
  }

  return propertyKeys.some((key) => matchesPropertyLink(candidate, key, target));
};

export default matchesAnyPropertyLink;
