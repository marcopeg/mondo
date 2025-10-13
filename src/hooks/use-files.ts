import { useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { CRMFileManager, CRMFilesChangedEvent } from "@/utils/CRMFileManager";
import { CRMFileType, isCRMFileType } from "@/types/CRMFileType";
import type { App } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

interface UseFilesOptions {
  /**
   * Optional filter applied after filtering by CRM type.
   * Receives the cached file (with frontmatter cache) and the Obsidian App.
   */
  filter?: (cached: TCachedFile, app: App) => boolean;
}

/**
 * Hook to get CRM files of a specific type from the singleton file manager.
 * This is optimized to avoid redundant filesystem access.
 */
export const useFiles = (
  type: string,
  options?: UseFilesOptions
): TCachedFile[] => {
  const app = useApp();

  const [files, setFiles] = useState<TCachedFile[]>([]);

  useEffect(() => {
    // Validate that the type is a valid CRM file type
    if (!isCRMFileType(type)) {
      console.warn(`useFiles: Invalid CRM file type "${type}"`);
      setFiles([]);
      return;
    }

    const fileManager = CRMFileManager.getInstance(app);

    const updateFiles = () => {
      const result = options?.filter
        ? fileManager.getFilesFiltered(type as CRMFileType, options.filter)
        : fileManager.getFiles(type as CRMFileType);
      setFiles(result);
    };

    // Get initial files (this will trigger auto-initialization if needed)
    updateFiles();

    // Listen for changes
    const listener = (event: CRMFilesChangedEvent) => {
      updateFiles();
    };

    fileManager.addListener(listener);

    return () => {
      fileManager.removeListener(listener);
    };
  }, [app, type, options?.filter]);

  return files;
};
