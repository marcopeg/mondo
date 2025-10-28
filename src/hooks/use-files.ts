import { useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { MondoFileManager, MondoFilesChangedEvent } from "@/utils/MondoFileManager";
import { MondoFileType, isMondoFileType } from "@/types/MondoFileType";
import type { App } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

interface UseFilesOptions {
  /**
   * Optional filter applied after filtering by Mondo type.
   * Receives the cached file (with frontmatter cache) and the Obsidian App.
   */
  filter?: (cached: TCachedFile, app: App) => boolean;
}

/**
 * Hook to get Mondo files of a specific type from the singleton file manager.
 * This is optimized to avoid redundant filesystem access.
 */
export const useFiles = (
  type: string,
  options?: UseFilesOptions
): TCachedFile[] => {
  const app = useApp();

  const [files, setFiles] = useState<TCachedFile[]>([]);

  useEffect(() => {
    // Validate that the type is a valid Mondo file type
    if (!isMondoFileType(type)) {
      console.warn(`useFiles: Invalid Mondo file type "${type}"`);
      setFiles([]);
      return;
    }

    const fileManager = MondoFileManager.getInstance(app);

    const updateFiles = () => {
      const result = options?.filter
        ? fileManager.getFilesFiltered(type as MondoFileType, options.filter)
        : fileManager.getFiles(type as MondoFileType);
      setFiles(result);
    };

    // Get initial files (this will trigger auto-initialization if needed)
    updateFiles();

    // Listen for changes
    const listener = (event: MondoFilesChangedEvent) => {
      updateFiles();
    };

    fileManager.addListener(listener);

    return () => {
      fileManager.removeListener(listener);
    };
  }, [app, type, options?.filter]);

  return files;
};
