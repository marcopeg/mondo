import { useEffect } from "react";
import { Modal, Notice, TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { isMondoEntityType } from "@/types/MondoFileType";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import createEntityForEntity from "@/utils/createEntityForEntity";
import type { TCachedFile } from "@/types/TCachedFile";
import type { MondoEntityCreateAttributes } from "@/types/MondoEntityConfig";

type RelatedEntityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: TFile) => void;
  targetType: string;
  title: string;
  hostFile: TCachedFile;
  titleTemplate?: string;
  attributes?: MondoEntityCreateAttributes;
  linkProperties?: string[];
  openAfterCreate?: boolean;
};

/**
 * Modal for selecting an existing entity or creating a new one for the createRelated feature.
 * Pre-populates the search with the configured title template.
 */
export const RelatedEntityModal = ({
  isOpen,
  onClose,
  onSelect,
  targetType,
  title,
  hostFile,
  titleTemplate,
  attributes,
  linkProperties,
  openAfterCreate = true,
}: RelatedEntityModalProps) => {
  const app = useApp();

  useEffect(() => {
    if (!isOpen) return;

    const modal = new RelatedPickerModal(
      app,
      title,
      targetType,
      hostFile,
      titleTemplate,
      attributes,
      linkProperties,
      openAfterCreate,
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
  }, [
    isOpen,
    app,
    title,
    targetType,
    hostFile,
    titleTemplate,
    attributes,
    linkProperties,
    openAfterCreate,
    onSelect,
    onClose,
  ]);

  return null;
};

class RelatedPickerModal extends Modal {
  private title: string;
  private targetType: string;
  private hostFile: TCachedFile;
  private titleTemplate?: string;
  private attributes?: MondoEntityCreateAttributes;
  private linkProperties?: string[];
  private openAfterCreate: boolean;
  private onSelect: (file: TFile) => void;
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
    targetType: string,
    hostFile: TCachedFile,
    titleTemplate: string | undefined,
    attributes: MondoEntityCreateAttributes | undefined,
    linkProperties: string[] | undefined,
    openAfterCreate: boolean,
    onSelect: (file: TFile) => void,
    onCancel: () => void
  ) {
    super(app);
    this.title = title;
    this.targetType = targetType;
    this.hostFile = hostFile;
    this.titleTemplate = titleTemplate;
    this.attributes = attributes;
    this.linkProperties = linkProperties;
    this.openAfterCreate = openAfterCreate;
    this.onSelect = onSelect;
    this.onCancel = onCancel;
  }

  onOpen() {
    this.modalEl.addClass("mondo-related-entity-modal");
    this.titleEl.setText(this.title);

    this.modalEl.style.maxWidth = "min(600px, 90vw)";
    this.contentEl.style.maxHeight = "min(70vh, 600px)";
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";

    const searchContainer = this.contentEl.createDiv({
      cls: "mondo-related-entity-search",
    });
    searchContainer.style.marginBottom = "1rem";
    searchContainer.style.flexShrink = "0";

    this.searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Search or create new...",
      cls: "mondo-related-entity-search-input",
    });
    this.searchInput.style.width = "100%";
    this.searchInput.style.padding = "0.75rem";
    this.searchInput.style.fontSize = "16px";
    this.searchInput.style.border =
      "1px solid var(--background-modifier-border)";
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

    this.resultsContainer = this.contentEl.createDiv({
      cls: "mondo-related-entity-results",
    });
    this.resultsContainer.style.maxHeight = "100%";
    this.resultsContainer.style.overflowY = "auto";
    this.resultsContainer.style.flex = "1";
    this.resultsContainer.style.minHeight = "0";
    this.resultsContainer.style.setProperty(
      "-webkit-overflow-scrolling",
      "touch"
    );

    this.loadEntities();
    this.prePopulateSearch();
    this.filterEntities();

    setTimeout(() => {
      this.searchInput?.focus();
      // Select all text so user can easily type to replace
      this.searchInput?.select();
    }, 50);
  }

  onClose() {
    this.contentEl.empty();
  }

  private prePopulateSearch() {
    if (!this.searchInput || !this.titleTemplate) return;

    // Apply basic template resolution for search pre-population
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const yy = yyyy.slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const dateISO = `${yyyy}-${month}-${day}`;
    const datetimeISO = now.toISOString();
    const hostName = getEntityDisplayName(this.hostFile);
    const hostFM = (this.hostFile.cache?.frontmatter as any) ?? {};

    let resolved = this.titleTemplate;

    // Handle {@this.show}
    resolved = resolved.replace(/\{\s*@this\.show\s*\}/gi, () => {
      const showAttr = hostFM.show;
      if (typeof showAttr === "string" && showAttr.trim()) {
        return showAttr.trim();
      }
      return hostName;
    });

    // Handle other tokens
    resolved = resolved
      .replace(/\{\s*datetime\s*\}/gi, datetimeISO)
      .replace(/\{\s*date\s*\}/gi, dateISO)
      .replace(/\{\s*show\s*\}/gi, hostName)
      .replace(/\{\s*(YYYY|yyyy)\s*\}/g, yyyy)
      .replace(/\{\s*(YY|yy)\s*\}/g, yy)
      .replace(/\{\s*(DD|dd)\s*\}/g, day)
      .replace(/\{\s*hh\s*\}/g, hour)
      .replace(/\{\s*mm\s*\}/g, minute)
      .replace(/\{\s*MM\s*\}/g, month);

    this.searchInput.value = resolved;
  }

  private async createNewEntity() {
    if (this.creating) return;
    this.creating = true;

    try {
      const searchTerm = (this.searchInput?.value || "").trim();
      const normalizedTarget = this.targetType.trim().toLowerCase();

      if (!isMondoEntityType(normalizedTarget)) {
        new Notice(`Cannot create: unknown entity type "${this.targetType}"`);
        return;
      }

      const created = await createEntityForEntity({
        app: this.app,
        targetType: normalizedTarget,
        hostEntity: this.hostFile,
        titleTemplate: searchTerm || this.titleTemplate,
        attributeTemplates: this.attributes,
        linkProperties: this.linkProperties,
        openAfterCreate: this.openAfterCreate,
      });

      if (!created) {
        new Notice("Failed to create entity note.");
        return;
      }

      this.onSelect(created);
      this.close();
    } catch (err) {
      console.error("RelatedPickerModal: createNewEntity failed", err);
      new Notice("Failed to create entity.");
    } finally {
      this.creating = false;
    }
  }

  private loadEntities() {
    const fileManager = MondoFileManager.getInstance(this.app);
    const normalizedTarget = this.targetType.trim().toLowerCase();

    if (!isMondoEntityType(normalizedTarget)) {
      this.allEntities = [];
      return;
    }

    const candidates = fileManager.getFiles(normalizedTarget as any);
    this.allEntities = candidates;
  }

  private filterEntities() {
    if (!this.searchInput || !this.resultsContainer) return;
    const searchTerm = this.searchInput.value.toLowerCase().trim();

    if (searchTerm === "") {
      this.filteredEntities = this.allEntities;
    } else {
      this.filteredEntities = this.allEntities.filter((file) =>
        getEntityDisplayName(file).toLowerCase().includes(searchTerm)
      );
    }

    this.selectedIndex = 0;
    this.renderResults();
  }

  private moveSelection(delta: number) {
    if (this.filteredEntities.length === 0) return;

    this.selectedIndex =
      (this.selectedIndex + delta + this.filteredEntities.length) %
      this.filteredEntities.length;
    this.renderResults();
    this.scrollToSelected();
  }

  private selectCurrentEntity() {
    if (this.filteredEntities.length === 0) return;

    const selectedFile = this.filteredEntities[this.selectedIndex];
    if (selectedFile) {
      void this.handleExistingEntitySelect(selectedFile);
    }
  }

  private async handleExistingEntitySelect(selectedFile: TCachedFile) {
    // Add backlink to the existing note based on linkProperties
    try {
      const linkProps = this.linkProperties || [];
      const hostFile = this.hostFile.file;

      // Add backlinks if linkProperties are configured
      if (linkProps.length > 0) {
        await this.app.fileManager.processFrontMatter(
          selectedFile.file,
          (frontmatter) => {
            const wiki = this.buildWikiLink(selectedFile.file.path, hostFile);

            linkProps.forEach((prop) => {
              const key = String(prop).trim();
              if (!key) return;

              const existing = (frontmatter as any)[key];
              if (Array.isArray(existing)) {
                const has = existing.some((e) => String(e).trim() === wiki);
                if (!has) existing.push(wiki);
              } else if (existing === undefined || existing === null) {
                (frontmatter as any)[key] = [wiki];
              } else {
                const val = String(existing).trim();
                const arr = val ? [val] : [];
                if (!arr.includes(wiki)) arr.push(wiki);
                (frontmatter as any)[key] = arr;
              }
            });
          }
        );
      }

      // Apply attribute templates if provided
      if (this.attributes && typeof this.attributes === "object") {
        await this.app.fileManager.processFrontMatter(
          selectedFile.file,
          (frontmatter) => {
            this.applyAttributes(frontmatter, selectedFile.file);
          }
        );
      }

      // Open the file if configured to do so
      if (this.openAfterCreate) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(selectedFile.file);
      }

      // Notify parent and close modal
      this.onSelect(selectedFile.file);
      this.close();
    } catch (err) {
      console.error(
        "RelatedPickerModal: handleExistingEntitySelect failed",
        err
      );
      new Notice("Failed to link existing note.");
    }
  }

  private buildWikiLink(sourcePath: string, targetFile: TFile): string {
    const linktext = this.app.metadataCache.fileToLinktext(
      targetFile,
      sourcePath,
      false
    );
    return `[[${linktext}]]`;
  }

  private applyAttributes(frontmatter: any, targetFile: TFile) {
    if (!this.attributes) return;

    const hostFM = (this.hostFile.cache?.frontmatter as any) ?? {};
    const hostName = getEntityDisplayName(this.hostFile);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const yy = yyyy.slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const dateISO = `${yyyy}-${month}-${day}`;
    const datetimeISO = now.toISOString();

    const deepClone = (val: unknown) => {
      try {
        return JSON.parse(JSON.stringify(val));
      } catch (_) {
        return val as any;
      }
    };

    const wiki = this.buildWikiLink(targetFile.path, this.hostFile.file);

    const processValue = (val: unknown): unknown => {
      if (typeof val === "string") {
        const m = val
          .trim()
          .match(/^\{\s*@this\s*(?:\.\s*([A-Za-z0-9_-]+)\s*)?\}$/);
        if (m) {
          const prop = m[1]?.trim();
          if (prop) {
            const src = hostFM[prop];
            if (src !== undefined) {
              return deepClone(src);
            }
            return undefined;
          }
          return wiki;
        }

        // Apply inline template resolution
        let out = val
          .replace(/\{\s*@this\.show\s*\}/gi, () => {
            const showAttr = hostFM.show;
            if (typeof showAttr === "string" && showAttr.trim()) {
              return showAttr.trim();
            }
            return hostName;
          })
          .replace(/\{\s*datetime\s*\}/gi, datetimeISO)
          .replace(/\{\s*date\s*\}/gi, dateISO)
          .replace(/\{\s*show\s*\}/gi, hostName)
          .replace(/\{\s*(YYYY|yyyy)\s*\}/g, yyyy)
          .replace(/\{\s*(YY|yy)\s*\}/g, yy)
          .replace(/\{\s*(DD|dd)\s*\}/g, day)
          .replace(/\{\s*hh\s*\}/g, hour)
          .replace(/\{\s*mm\s*\}/g, minute)
          .replace(/\{\s*MM\s*\}/g, month);

        return out;
      }

      if (typeof val === "number" || typeof val === "boolean") {
        return val;
      }

      if (Array.isArray(val)) {
        const outArr: unknown[] = [];
        for (const item of val) {
          const processed = processValue(item);
          if (processed === undefined) continue;
          if (Array.isArray(processed)) {
            outArr.push(...processed.map((x) => deepClone(x)));
          } else {
            outArr.push(processed);
          }
        }
        return outArr;
      }

      if (typeof val === "object" && val !== null) {
        return deepClone(val);
      }

      return val;
    };

    Object.entries(this.attributes as Record<string, unknown>).forEach(
      ([k, v]) => {
        const key = String(k).trim();
        if (
          key.toLowerCase() === "type" ||
          key.toLowerCase() === "mondotype"
        ) {
          return;
        }

        const processed = processValue(v);
        if (processed === undefined) return;

        // Add to existing values instead of replacing
        const existing = frontmatter[key];
        if (Array.isArray(processed)) {
          if (Array.isArray(existing)) {
            // Merge arrays, avoiding duplicates
            const existingSet = new Set(existing.map((e) => String(e).trim()));
            processed.forEach((item) => {
              const itemStr = String(item).trim();
              if (!existingSet.has(itemStr)) {
                existing.push(item);
              }
            });
          } else if (existing === undefined || existing === null) {
            frontmatter[key] = processed;
          } else {
            // Existing is a single value, convert to array
            const val = String(existing).trim();
            const arr = val ? [existing, ...processed] : processed;
            frontmatter[key] = arr;
          }
        } else {
          // Processed is a single value
          if (Array.isArray(existing)) {
            const processedStr = String(processed).trim();
            const has = existing.some((e) => String(e).trim() === processedStr);
            if (!has) {
              existing.push(processed);
            }
          } else if (existing === undefined || existing === null) {
            frontmatter[key] = processed;
          } else {
            // Both are single values, convert to array
            const existingStr = String(existing).trim();
            const processedStr = String(processed).trim();
            if (existingStr !== processedStr) {
              frontmatter[key] = [existing, processed];
            }
            // If they're the same, keep the existing value
          }
        }
      }
    );
  }

  private scrollToSelected() {
    if (!this.resultsContainer) return;

    const items = this.resultsContainer.querySelectorAll(
      ".mondo-related-entity-item"
    );
    const selectedItem = items[this.selectedIndex];
    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  private renderResults() {
    if (!this.resultsContainer) return;
    this.resultsContainer.empty();

    if (this.filteredEntities.length === 0) {
      const wrapper = this.resultsContainer.createDiv({
        cls: "mondo-related-entity-empty",
      });
      wrapper.style.padding = "1rem";
      wrapper.style.textAlign = "center";

      const message = wrapper.createDiv();
      message.style.marginBottom = "1rem";
      message.style.color = "var(--text-muted)";
      message.setText("No matching entities found");

      const btn = wrapper.createEl("button", {
        text: "Create new entity",
      });
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
      const item = this.resultsContainer!.createDiv({
        cls: "mondo-related-entity-item",
      });
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
        this.selectedIndex = index;
        this.renderResults();
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
        void this.handleExistingEntitySelect(file);
      });
    });
  }
}
