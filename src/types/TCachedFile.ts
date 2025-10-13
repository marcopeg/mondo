import type { TFile, CachedMetadata } from "obsidian";

/**
 * A file with its cached metadata attached.
 * Used throughout the CRM plugin to avoid redundant cache lookups.
 */
export interface TCachedFile {
  file: TFile;
  cache?: CachedMetadata;
}
