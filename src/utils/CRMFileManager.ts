import { TFile, App, EventRef } from "obsidian";
import { TCachedFile } from "@/types/TCachedFile";
import {
  CRMFileType,
  CRM_FILE_TYPES,
  isCRMFileType,
} from "@/types/CRMFileType";

/**
 * Event emitted when the CRM files list changes
 */
export interface CRMFilesChangedEvent {
  type: "files-changed";
  files: Map<CRMFileType, TCachedFile[]>;
}

/**
 * Singleton class to manage CRM files efficiently.
 * Keeps an in-memory cache of all CRM files and listens for file system changes.
 */
export class CRMFileManager {
  private static instance: CRMFileManager | null = null;

  private app: App;
  private files: Map<CRMFileType, TCachedFile[]> = new Map();
  private eventRefs: EventRef[] = [];
  private listeners: Set<(event: CRMFilesChangedEvent) => void> = new Set();
  private isInitialized = false;
  private isScanning = false;
  private pendingInitPromise: Promise<void> | null = null;
  private scanDebounceTimer: number | null = null;

  private constructor(app: App) {
    this.app = app;

    // Initialize empty arrays for each file type
    CRM_FILE_TYPES.forEach((type) => {
      this.files.set(type, []);
    });
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(app: App): CRMFileManager {
    if (!CRMFileManager.instance) {
      CRMFileManager.instance = new CRMFileManager(app);
    }
    return CRMFileManager.instance;
  }

  /**
   * Initialize the file manager - should be called once during plugin load
   * Returns a promise that resolves when the initial scan is complete
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // If already initializing, wait for it to complete
    if (this.pendingInitPromise) {
      return this.pendingInitPromise;
    }

    this.pendingInitPromise = this.doInitialize();
    await this.pendingInitPromise;
    this.pendingInitPromise = null;
  }

  private async doInitialize(): Promise<void> {
    // Wait for metadata cache to be ready
    await this.waitForMetadataCache();

    // Initial scan
    await this.scanFiles();

    // Listen for file system changes
    this.eventRefs.push(
      this.app.metadataCache.on("changed", () => this.debouncedScanFiles()),
      this.app.vault.on("modify", () => this.debouncedScanFiles()),
      this.app.vault.on("create", () => this.debouncedScanFiles()),
      this.app.vault.on("delete", () => this.debouncedScanFiles()),
      this.app.vault.on("rename", () => this.debouncedScanFiles())
    );

    this.isInitialized = true;
  }

  /**
   * Wait for the metadata cache to be ready
   */
  private async waitForMetadataCache(): Promise<void> {
    // If the workspace is already ready, metadata should be available
    if (this.app.workspace.layoutReady) {
      return;
    }

    // Otherwise wait for layout ready
    return new Promise((resolve) => {
      if (this.app.workspace.layoutReady) {
        resolve();
        return;
      }

      const checkReady = () => {
        if (this.app.workspace.layoutReady) {
          // Give a small delay for metadata cache to settle
          setTimeout(resolve, 100);
          return;
        }
        // Check again in 50ms
        setTimeout(checkReady, 50);
      };

      checkReady();
    });
  }

  /**
   * Clean up the file manager - should be called during plugin unload
   */
  public cleanup(): void {
    // Clear debounce timer
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = null;
    }

    // Remove all event listeners
    this.eventRefs.forEach((ref) => {
      this.app.metadataCache.offref(ref);
      this.app.vault.offref(ref);
    });
    this.eventRefs = [];

    // Clear listeners
    this.listeners.clear();

    // Clear files cache
    this.files.clear();

    this.isInitialized = false;
    CRMFileManager.instance = null;
  }

  /**
   * Debounced version of scanFiles to prevent excessive scanning
   */
  private debouncedScanFiles(): void {
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
    }
    this.scanDebounceTimer = window.setTimeout(() => {
      this.scanFiles();
      this.scanDebounceTimer = null;
    }, 100); // 100ms debounce
  }

  /**
   * Scan all files and update the cache
   */
  private async scanFiles(): Promise<void> {
    // Prevent concurrent scans
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // Clear current files
      CRM_FILE_TYPES.forEach((type) => {
        this.files.set(type, []);
      });

      // Get all markdown files
      const allFiles = this.app.vault.getMarkdownFiles();
      const pendingFiles: TFile[] = [];

      for (const file of allFiles) {
        const cache = this.app.metadataCache.getFileCache(file);

        if (!cache) {
          // If no cache, this file might need more time for metadata processing
          pendingFiles.push(file);
          continue;
        }

        const fileType = cache?.frontmatter?.type;

        // Check if this is a CRM file
        if (fileType && isCRMFileType(fileType)) {
          this.addFileToCache(fileType, file, cache);
        }
      }

      // If we have pending files, try again after a short delay
      if (pendingFiles.length > 0 && this.isInitialized) {
        setTimeout(() => {
          this.processPendingFiles(pendingFiles);
        }, 200);
      }

      // Notify listeners
      this.notifyListeners();
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Get files of a specific type
   * Ensures initialization if not already done
   */
  public getFiles(type: CRMFileType): TCachedFile[] {
    // Trigger initialization if not started yet
    if (!this.isInitialized && !this.pendingInitPromise) {
      this.initialize().catch((err) => {
        console.error("CRMFileManager: Failed to auto-initialize:", err);
      });
    }
    return this.files.get(type) || [];
  }

  public getFileByPath(path: string): TCachedFile | undefined {
    if (!this.isInitialized && !this.pendingInitPromise) {
      this.initialize().catch((err) => {
        console.error("CRMFileManager: Failed to auto-initialize:", err);
      });
    }

    for (const [, cachedFiles] of this.files) {
      const match = cachedFiles.find((cached) => cached.file.path === path);
      if (match) return match;
    }

    return undefined;
  }

  /**
   * Get files of a specific type with additional filtering
   */
  public getFilesFiltered(
    type: CRMFileType,
    filter?: (cached: TCachedFile, app: App) => boolean
  ): TCachedFile[] {
    const files = this.getFiles(type);

    if (!filter) return files;

    return files.filter((cachedFile) => {
      try {
        return filter(cachedFile, this.app);
      } catch (e) {
        // If user filter throws, exclude the file and don't break
        console.error("CRMFileManager filter error:", e);
        return false;
      }
    });
  }

  /**
   * Process files that didn't have cache available during initial scan
   */
  private processPendingFiles(pendingFiles: TFile[]): void {
    let hasNewFiles = false;

    for (const file of pendingFiles) {
      const cache = this.app.metadataCache.getFileCache(file);

      if (cache) {
        const fileType = cache?.frontmatter?.type;

        if (fileType && isCRMFileType(fileType)) {
          const wasAdded = this.addFileToCache(fileType, file, cache);
          if (wasAdded) {
            hasNewFiles = true;
          }
        }
      }
    }

    // Only notify if we actually found new files
    if (hasNewFiles) {
      this.notifyListeners();
    }
  }

  /**
   * Add a file to cache with deduplication by file path
   * Returns true if file was actually added (not a duplicate)
   */
  private addFileToCache(
    fileType: CRMFileType,
    file: TFile,
    cache: any
  ): boolean {
    const currentFiles = this.files.get(fileType) || [];

    // Check if file already exists (deduplicate by path)
    const existingIndex = currentFiles.findIndex(
      (cached) => cached.file.path === file.path
    );

    if (existingIndex !== -1) {
      const existing = currentFiles[existingIndex];
      let hasChanged = false;

      if (existing.file !== file) {
        existing.file = file;
        hasChanged = true;
      }

      if (existing.cache !== cache) {
        existing.cache = cache || undefined;
        hasChanged = true;
      }

      if (hasChanged) {
        currentFiles[existingIndex] = existing;
        this.files.set(fileType, currentFiles);
      }

      return hasChanged;
    }

    const cachedFile: TCachedFile = {
      file,
      cache: cache || undefined,
    };

    currentFiles.push(cachedFile);
    this.files.set(fileType, currentFiles);
    return true; // File was added
  }

  /**
   * Add a listener for file changes
   */
  public addListener(listener: (event: CRMFilesChangedEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener
   */
  public removeListener(listener: (event: CRMFilesChangedEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const event: CRMFilesChangedEvent = {
      type: "files-changed",
      files: new Map(this.files), // Create a copy
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("CRMFileManager listener error:", e);
      }
    });
  }

  /**
   * Force a refresh of the file cache
   */
  public refresh(): void {
    this.scanFiles();
  }

  /**
   * Get statistics about cached files
   */
  public getStats(): { [K in CRMFileType]: number } {
    const stats = {} as { [K in CRMFileType]: number };

    CRM_FILE_TYPES.forEach((type) => {
      stats[type] = this.files.get(type)?.length || 0;
    });

    return stats;
  }
}
