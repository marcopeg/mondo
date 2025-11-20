import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { MONDO_FILE_TYPES } from "@/types/MondoFileType";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import type { TCachedFile } from "@/types/TCachedFile";
import type { MondoEntityFrontmatterFieldConfig } from "@/types/MondoEntityConfig";

type EntitySelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: TCachedFile) => void;
  config: MondoEntityFrontmatterFieldConfig;
  title: string;
  hostFile: TCachedFile;
  propertyKey: string;
};

/**
 * Modal for selecting an entity from a filtered list based on the frontmatter config.
 * Supports search and filtering similar to backlinks panels.
 */
export const EntitySelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  config,
  title,
  hostFile,
  propertyKey,
}: EntitySelectionModalProps) => {
  const app = useApp();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const modal = new EntityPickerModal(
      app,
      title,
      config,
      hostFile,
      propertyKey,
      (selectedFile) => {
        onSelect(selectedFile);
        onClose();
      },
      onClose
    );

    modal.open();

    return () => {
      try {
        modal.close();
      } catch (e) {
        // Modal may already be closed
      }
    };
  }, [isOpen, app, title, config, hostFile, propertyKey, onSelect, onClose]);

  return null;
};

class EntityPickerModal extends Modal {
  private title: string;
  private config: MondoEntityFrontmatterFieldConfig;
  private hostFile: TCachedFile;
  private propertyKey: string;
  private onSelect: (file: TCachedFile) => void;
  private onCancel: () => void;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLDivElement | null = null;
  private allEntities: TCachedFile[] = [];
  private filteredEntities: TCachedFile[] = [];

  constructor(
    app: any,
    title: string,
    config: MondoEntityFrontmatterFieldConfig,
    hostFile: TCachedFile,
    propertyKey: string,
    onSelect: (file: TCachedFile) => void,
    onCancel: () => void
  ) {
    super(app);
    this.title = title;
    this.config = config;
    this.hostFile = hostFile;
    this.propertyKey = propertyKey;
    this.onSelect = onSelect;
    this.onCancel = onCancel;
  }

  onOpen() {
    this.modalEl.addClass("mondo-entity-picker-modal");
    this.titleEl.setText(this.title);

    // Make modal more responsive on mobile
    this.modalEl.style.maxWidth = "min(600px, 90vw)";
    this.contentEl.style.maxHeight = "min(70vh, 600px)";
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";

    // Create search input
    const searchContainer = this.contentEl.createDiv({
      cls: "mondo-entity-picker-search",
    });
    searchContainer.style.marginBottom = "1rem";
    searchContainer.style.flexShrink = "0";

    this.searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Search...",
      cls: "mondo-entity-picker-search-input",
    });
    this.searchInput.style.width = "100%";
    this.searchInput.style.padding = "0.75rem";
    this.searchInput.style.fontSize = "16px"; // Prevent zoom on iOS
    this.searchInput.style.border =
      "1px solid var(--background-modifier-border)";
    this.searchInput.style.borderRadius = "4px";
    this.searchInput.style.backgroundColor = "var(--background-primary)";
    this.searchInput.style.color = "var(--text-normal)";

    this.searchInput.addEventListener("input", () => {
      this.filterEntities();
    });

    // Create results container
    this.resultsContainer = this.contentEl.createDiv({
      cls: "mondo-entity-picker-results",
    });
    this.resultsContainer.style.maxHeight = "100%";
    this.resultsContainer.style.overflowY = "auto";
    this.resultsContainer.style.flex = "1";
    this.resultsContainer.style.minHeight = "0";
    // Better scrolling on mobile (using setProperty to avoid TS error)
    this.resultsContainer.style.setProperty("-webkit-overflow-scrolling", "touch");

    // Load and filter entities
    this.loadEntities();
    this.filterEntities();

    // Focus search input
    setTimeout(() => {
      this.searchInput?.focus();
    }, 50);
  }

  onClose() {
    this.contentEl.empty();
  }

  private loadEntities() {
    const fileManager = MondoFileManager.getInstance(this.app);

    // Get all files that match the filter configuration
    let candidates: TCachedFile[] = [];

    // If find query is specified, use it (similar to backlinks panel logic)
    if (this.config.find && this.config.find.query) {
      candidates = this.evaluateFindQuery(
        this.config.find,
        fileManager,
        this.hostFile
      );
    } else {
      // Otherwise, get all Mondo files
      (MONDO_FILE_TYPES as string[]).forEach((type) => {
        const files = fileManager.getFiles(type as any);
        candidates.push(...files);
      });
    }

    // Apply filter predicate if specified
    if (this.config.filter) {
      candidates = candidates.filter((file) =>
        this.evalFilterExpr(file, this.config.filter)
      );
    }

    // Remove duplicates by path
    const seen = new Set<string>();
    
    // Get current values to filter out already linked entities
    const currentPaths = new Set<string>();
    const frontmatterVal = this.hostFile.cache?.frontmatter?.[this.propertyKey];
    
    if (frontmatterVal) {
      const values = Array.isArray(frontmatterVal) ? frontmatterVal : [frontmatterVal];
      values.forEach(val => {
        if (typeof val === 'string') {
          // Extract link text from [[Link]] or use raw string
          const match = /\[\[(.*?)\]\]/.exec(val);
          const linkText = match ? match[1].split('|')[0] : val;
          
          // Resolve to file
          const file = this.app.metadataCache.getFirstLinkpathDest(linkText, this.hostFile.file.path);
          if (file) {
            currentPaths.add(file.path);
          }
        }
      });
    }

    this.allEntities = candidates.filter((file) => {
      if (seen.has(file.file.path)) {
        return false;
      }
      seen.add(file.file.path);

      if (currentPaths.has(file.file.path)) {
        return false;
      }

      return true;
    });
  }

  private evaluateFindQuery(
    findConfig: NonNullable<MondoEntityFrontmatterFieldConfig["find"]>,
    fileManager: MondoFileManager,
    hostFile: TCachedFile
  ): TCachedFile[] {
    // Simplified find query evaluation
    // This is a basic implementation - a full implementation would need to handle
    // all the complex query steps from BacklinksLinks
    const results: TCachedFile[] = [];

    findConfig.query.forEach((rule) => {
      rule.steps.forEach((step) => {
        if ((step as any).filter) {
          const { type } = (step as any).filter as { type?: string | string[] };
          if (type) {
            const types = Array.isArray(type) ? type : [type];
            types.forEach((t) => {
              const files = fileManager.getFiles(t as any);
              results.push(...files);
            });
          }
        }
      });
    });

    return results;
  }

  private evalFilterExpr(
    entry: TCachedFile,
    filter: unknown
  ): boolean {
    if (!filter) {
      return true;
    }

    if (typeof filter === "object" && filter !== null) {
      const obj = filter as any;

      // Handle { all: [...] }
      if (Array.isArray(obj.all)) {
        return obj.all.every((e: unknown) => this.evalFilterExpr(entry, e));
      }

      // Handle { any: [...] }
      if (Array.isArray(obj.any)) {
        return obj.any.some((e: unknown) => this.evalFilterExpr(entry, e));
      }

      // Handle { not: ... }
      if (obj.not !== undefined) {
        return !this.evalFilterExpr(entry, obj.not);
      }

      // Handle property filters like { type: { in: ["person", "company"] } }
      if (obj.type) {
        const mondoType = String(
          (entry.cache?.frontmatter as any)?.mondoType ||
            (entry.cache?.frontmatter as any)?.type ||
            ""
        )
          .trim()
          .toLowerCase();

        if (typeof obj.type === "object" && obj.type.in) {
          const types = Array.isArray(obj.type.in)
            ? obj.type.in
            : [obj.type.in];
          return types.includes(mondoType);
        }

        if (typeof obj.type === "string") {
          return mondoType === obj.type.toLowerCase();
        }
      }
    }

    return true;
  }

  private filterEntities() {
    if (!this.searchInput || !this.resultsContainer) {
      return;
    }

    const searchTerm = this.searchInput.value.toLowerCase().trim();

    if (searchTerm === "") {
      this.filteredEntities = this.allEntities;
    } else {
      this.filteredEntities = this.allEntities.filter((file) => {
        const displayName = getEntityDisplayName(file).toLowerCase();
        return displayName.includes(searchTerm);
      });
    }

    this.renderResults();
  }

  private renderResults() {
    if (!this.resultsContainer) {
      return;
    }

    this.resultsContainer.empty();

    if (this.filteredEntities.length === 0) {
      const emptyMessage = this.resultsContainer.createDiv({
        cls: "mondo-entity-picker-empty",
        text: "No entities found",
      });
      emptyMessage.style.padding = "1rem";
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.color = "var(--text-muted)";
      return;
    }

    this.filteredEntities.forEach((file) => {
      const item = this.resultsContainer!.createDiv({
        cls: "mondo-entity-picker-item",
      });
      item.style.padding = "0.75rem";
      item.style.cursor = "pointer";
      item.style.borderRadius = "4px";
      item.style.touchAction = "manipulation"; // Better touch handling
      item.style.minHeight = "44px"; // Minimum touch target size
      item.style.display = "flex";
      item.style.alignItems = "center";

      const displayName = getEntityDisplayName(file);
      item.setText(displayName);

      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "var(--background-modifier-hover)";
      });

      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "";
      });

      // Add active state for touch
      item.addEventListener("touchstart", () => {
        item.style.backgroundColor = "var(--background-modifier-hover)";
      });

      item.addEventListener("touchend", () => {
        setTimeout(() => {
          item.style.backgroundColor = "";
        }, 100);
      });

      item.addEventListener("click", () => {
        this.onSelect(file);
        this.close();
      });
    });
  }
}
