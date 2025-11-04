import { App, Notice, TFile } from "obsidian";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { MONDO_FILE_TYPES } from "@/types/MondoFileType";

/**
 * Migrates all notes from using "type" to "mondoType" in frontmatter
 * Returns the count of files that were updated
 */
export const migrateAllLegacyTypeKeys = async (app: App): Promise<number> => {
  const fileManager = MondoFileManager.getInstance(app);
  let updateCount = 0;

  // Get all Mondo files from all types
  for (const fileType of MONDO_FILE_TYPES) {
    const files = fileManager.getFiles(fileType);

    for (const cachedFile of files) {
      const file = cachedFile.file;
      if (!(file instanceof TFile)) {
        continue;
      }

      // Check if the file has the legacy "type" key
      const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
      if (!frontmatter || !("type" in frontmatter)) {
        continue;
      }

      // Skip if it already has mondoType (shouldn't happen, but just in case)
      if ("mondoType" in frontmatter) {
        continue;
      }

      try {
        await app.fileManager.processFrontMatter(file, (fm) => {
          // Copy "type" value to "mondoType"
          if (fm.type !== undefined && fm.mondoType === undefined) {
            fm.mondoType = fm.type;
            // Delete the old "type" key
            delete fm.type;
            updateCount++;
          }
        });
      } catch (error) {
        console.error(
          `migrateLegacyTypeKeys: Failed to migrate file ${file.path}`,
          error
        );
      }
    }
  }

  return updateCount;
};

/**
 * Check if there are any notes using the legacy "type" key
 */
export const hasLegacyTypeKeys = async (app: App): Promise<boolean> => {
  const fileManager = MondoFileManager.getInstance(app);

  for (const fileType of MONDO_FILE_TYPES) {
    const files = fileManager.getFiles(fileType);

    for (const cachedFile of files) {
      const file = cachedFile.file;
      const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;

      if (frontmatter && "type" in frontmatter && !("mondoType" in frontmatter)) {
        return true;
      }
    }
  }

  return false;
};
