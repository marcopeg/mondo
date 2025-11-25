import { useEffect } from "react";
import { Modal, Notice, TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { MONDO_FILE_TYPES, isMondoEntityType } from "@/types/MondoFileType";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import createEntityForEntity from "@/utils/createEntityForEntity";
import { MONDO_ENTITIES } from "@/entities";
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
  openCount?: number;
};

/**
 * Modal for selecting or creating an entity referenced by a dynamic frontmatter property.
 * If no entities match the search, a "Create new entity" button is shown that creates a new
 * note for the inferred entity type (propertyKey) using IMS template/frontmatter, links it, and closes.
 */
export const EntitySelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  config,
  title,
  hostFile,
  propertyKey,
  openCount = 0,
}: EntitySelectionModalProps) => {
  const app = useApp();

  useEffect(() => {
    if (!isOpen) return;

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
      } catch (_) {
        // already closed
      }
    };
  }, [isOpen, app, title, config, hostFile, propertyKey, onSelect, onClose, openCount]);

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
  private creating = false;
  private selectedIndex = 0;

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

    this.modalEl.style.maxWidth = "min(600px, 90vw)";
    this.contentEl.style.maxHeight = "min(70vh, 600px)";
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";

    const searchContainer = this.contentEl.createDiv({ cls: "mondo-entity-picker-search" });
    searchContainer.style.marginBottom = "1rem";
    searchContainer.style.flexShrink = "0";

    this.searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Search...",
      cls: "mondo-entity-picker-search-input",
    });
    this.searchInput.style.width = "100%";
    this.searchInput.style.padding = "0.75rem";
    this.searchInput.style.fontSize = "16px";
    this.searchInput.style.border = "1px solid var(--background-modifier-border)";
    this.searchInput.style.borderRadius = "4px";
    this.searchInput.style.backgroundColor = "var(--background-primary)";
    this.searchInput.style.color = "var(--text-normal)";

    this.searchInput.addEventListener("input", () => this.filterEntities());
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.moveSelection(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (this.filteredEntities.length === 0) {
          void this.createNewEntity();
        } else {
          this.selectCurrentEntity();
        }
      }
    });

    this.resultsContainer = this.contentEl.createDiv({ cls: "mondo-entity-picker-results" });
    this.resultsContainer.style.maxHeight = "100%";
    this.resultsContainer.style.overflowY = "auto";
    this.resultsContainer.style.flex = "1";
    this.resultsContainer.style.minHeight = "0";
    this.resultsContainer.style.setProperty("-webkit-overflow-scrolling", "touch");

    this.loadEntities();
    this.filterEntities();

    setTimeout(() => this.searchInput?.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }

  private async createNewEntity() {
    if (this.creating) return;
    this.creating = true;
    try {
      const rawTitle = (this.searchInput?.value || "").trim();
      const targetType = this.propertyKey.trim().toLowerCase();
      if (!isMondoEntityType(targetType)) {
        new Notice(`Cannot create: unknown entity type "${this.propertyKey}"`);
        return;
      }

      // Build attributes that copy shared frontmatter properties from host to new entity
      const sharedAttributes: Record<string, string> = {};
      const targetEntity = MONDO_ENTITIES[targetType as any];
      const hostFrontmatter = (this.hostFile.cache?.frontmatter || {}) as Record<string, unknown>;

      // Parse the target entity's template to find which frontmatter properties it defines
      const targetTemplate = targetEntity?.template || "";
      const targetProperties = new Set<string>();
      
      // Extract properties from template (format: "propertyName: value\n")
      // Match lines before the "---" separator that contain property definitions
      const beforeSeparator = targetTemplate.split("---")[0] || "";
      const propertyMatches = beforeSeparator.matchAll(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/gm);
      for (const match of propertyMatches) {
        if (match[1] && match[1] !== "date" && match[1] !== "datetime") {
          targetProperties.add(match[1].trim());
        }
      }

      // Also check the frontmatter schema of the target entity for additional properties
      // This covers properties like "company" which may not be in the template string but
      // are defined in the entity's frontmatter configuration
      const targetFrontmatterSchema = (targetEntity as { frontmatter?: Record<string, unknown> })?.frontmatter;
      if (targetFrontmatterSchema && typeof targetFrontmatterSchema === "object") {
        Object.keys(targetFrontmatterSchema).forEach((propKey) => {
          if (propKey !== "date" && propKey !== "datetime") {
            targetProperties.add(propKey);
          }
        });
      }

      // For each property defined in target template/schema that also exists in host frontmatter,
      // copy the value if it's non-empty
      targetProperties.forEach((propKey) => {
        const hostValue = hostFrontmatter[propKey];
        // Only copy if the host has a non-empty value
        if (hostValue !== undefined && hostValue !== null) {
          if (typeof hostValue === "string" && hostValue.trim() === "") {
            return; // skip empty strings
          }
          if (Array.isArray(hostValue) && hostValue.length === 0) {
            return; // skip empty arrays
          }
          // Copy the value using {@this.propKey} syntax so createEntityForEntity handles it
          sharedAttributes[propKey] = `{@this.${propKey}}`;
        }
      });

      const created = await createEntityForEntity({
        app: this.app,
        targetType,
        hostEntity: this.hostFile,
        titleTemplate: rawTitle || undefined,
        attributeTemplates: sharedAttributes,
        linkProperties: [],
        openAfterCreate: false, // create silently
      });

      if (!created) {
        new Notice("Failed to create entity note.");
        return;
      }

      // Link new entity in host frontmatter under propertyKey
      let linktext = this.app.metadataCache.fileToLinktext(created, this.hostFile.file.path, false);
      // Remove .md extension if present
      linktext = linktext.replace(/\.md$/i, '');
      const wiki = `[[${linktext}]]`;
      await this.app.fileManager.processFrontMatter(this.hostFile.file, (fm) => {
        const key = this.propertyKey;
        const current = fm[key];
        
        // Always store values as arrays
        if (Array.isArray(current)) {
          if (!current.includes(wiki)) current.push(wiki);
        } else if (typeof current === "string" && current.trim()) {
          fm[key] = current === wiki ? [current] : [current, wiki];
        } else {
          fm[key] = [wiki];
        }
      });

      // Build TCachedFile for callback
      const cache = this.app.metadataCache.getFileCache(created) || undefined;
      const fileManager = MondoFileManager.getInstance(this.app);
      // Attempt to refresh manager so subsequent opens include new file
      fileManager.refresh();
      const cached: TCachedFile = fileManager.getFileByPath(created.path) || { file: created as TFile, cache };

      this.onSelect(cached);
      this.close();
    } catch (err) {
      console.error("EntityPickerModal: createNewEntity failed", err);
      new Notice("Failed to create entity.");
    } finally {
      this.creating = false;
    }
  }

  private loadEntities() {
    const fileManager = MondoFileManager.getInstance(this.app);
    let candidates: TCachedFile[] = [];

    if (this.config.find && this.config.find.query) {
      candidates = this.evaluateFindQuery(this.config.find, fileManager, this.hostFile);
    } else {
      (MONDO_FILE_TYPES as string[]).forEach((type) => {
        const files = fileManager.getFiles(type as any);
        candidates.push(...files);
      });
    }

    if (this.config.filter) {
      candidates = candidates.filter((file) => this.evalFilterExpr(file, this.config.filter));
    }

    const seen = new Set<string>();
    const currentPaths = new Set<string>();
    // Use config.key if specified, otherwise fall back to propertyKey
    const actualKey = this.config.key || this.propertyKey;
    const frontmatterVal = this.hostFile.cache?.frontmatter?.[actualKey];
    if (frontmatterVal) {
      const values = Array.isArray(frontmatterVal) ? frontmatterVal : [frontmatterVal];
      values.forEach((val) => {
        if (typeof val === "string") {
          const match = /\[\[(.*?)\]\]/.exec(val);
          const linkText = match ? match[1].split("|")[0] : val;
          const f = this.app.metadataCache.getFirstLinkpathDest(linkText, this.hostFile.file.path);
          if (f) currentPaths.add(f.path);
        }
      });
    }

    this.allEntities = candidates.filter((file) => {
      if (seen.has(file.file.path)) return false;
      seen.add(file.file.path);
      if (currentPaths.has(file.file.path)) return false;
      return true;
    });
  }

  private evaluateFindQuery(
    findConfig: NonNullable<MondoEntityFrontmatterFieldConfig["find"]>,
    fileManager: MondoFileManager,
    _hostFile: TCachedFile
  ): TCachedFile[] {
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

  private evalFilterExpr(entry: TCachedFile, filter: unknown): boolean {
    if (!filter) return true;
    if (typeof filter === "object" && filter !== null) {
      const obj = filter as any;
      if (Array.isArray(obj.all)) return obj.all.every((e: unknown) => this.evalFilterExpr(entry, e));
      if (Array.isArray(obj.any)) return obj.any.some((e: unknown) => this.evalFilterExpr(entry, e));
      if (obj.not !== undefined) return !this.evalFilterExpr(entry, obj.not);
      if (obj.type) {
        const mondoType = String((entry.cache?.frontmatter as any)?.mondoType || (entry.cache?.frontmatter as any)?.type || "").trim().toLowerCase();
        if (typeof obj.type === "object" && obj.type.in) {
          const types = Array.isArray(obj.type.in) ? obj.type.in : [obj.type.in];
          return types.includes(mondoType);
        }
        if (typeof obj.type === "string") return mondoType === obj.type.toLowerCase();
      }
    }
    return true;
  }

  private filterEntities() {
    if (!this.searchInput || !this.resultsContainer) return;
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm === "") {
      this.filteredEntities = this.allEntities;
    } else {
      this.filteredEntities = this.allEntities.filter((file) => getEntityDisplayName(file).toLowerCase().includes(searchTerm));
    }
    this.selectedIndex = 0;
    this.renderResults();
  }

  private moveSelection(delta: number) {
    if (this.filteredEntities.length === 0) return;
    
    this.selectedIndex = (this.selectedIndex + delta + this.filteredEntities.length) % this.filteredEntities.length;
    this.renderResults();
    this.scrollToSelected();
  }

  private selectCurrentEntity() {
    if (this.filteredEntities.length === 0) return;
    
    const selectedFile = this.filteredEntities[this.selectedIndex];
    if (selectedFile) {
      this.onSelect(selectedFile);
      this.close();
    }
  }

  private scrollToSelected() {
    if (!this.resultsContainer) return;
    
    const items = this.resultsContainer.querySelectorAll('.mondo-entity-picker-item');
    const selectedItem = items[this.selectedIndex];
    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private renderResults() {
    if (!this.resultsContainer) return;
    this.resultsContainer.empty();

    if (this.filteredEntities.length === 0) {
      const wrapper = this.resultsContainer.createDiv({ cls: "mondo-entity-picker-empty" });
      wrapper.style.padding = "1rem";
      wrapper.style.textAlign = "center";

      const btn = wrapper.createEl("button", { text: "Create new entity" });
      btn.type = "button";
      btn.style.padding = "0.5rem 0.75rem";
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.style.backgroundColor = "var(--interactive-normal)";
      btn.style.color = "var(--text-on-accent)";
      btn.style.border = "1px solid var(--background-modifier-border)";
      btn.addEventListener("click", () => void this.createNewEntity());
      return;
    }

    this.filteredEntities.forEach((file, index) => {
      const item = this.resultsContainer!.createDiv({ cls: "mondo-entity-picker-item" });
      item.style.padding = "0.75rem";
      item.style.cursor = "pointer";
      item.style.borderRadius = "4px";
      item.style.touchAction = "manipulation";
      item.style.minHeight = "44px";
      item.style.display = "flex";
      item.style.alignItems = "center";

      const isSelected = index === this.selectedIndex;
      if (isSelected) {
        item.style.backgroundColor = "var(--background-modifier-hover)";
      }

      item.setText(getEntityDisplayName(file));

      item.addEventListener("mouseenter", () => {
        if (this.selectedIndex !== index) {
          this.selectedIndex = index;
          this.renderResults();
        }
      });
      item.addEventListener("mouseleave", () => {
        if (!isSelected) {
          item.style.backgroundColor = "";
        }
      });
      item.addEventListener("touchstart", () => {
        this.selectedIndex = index;
        item.style.backgroundColor = "var(--background-modifier-hover)";
      });
      item.addEventListener("touchend", () => {
        setTimeout(() => (item.style.backgroundColor = ""), 100);
      });
      item.addEventListener("click", () => {
        this.onSelect(file);
        this.close();
      });
    });
  }
}