import {
  App,
  Modal,
  TFile,
  AbstractInputSuggest,
  FuzzySuggestModal,
  Setting,
} from "obsidian";
import type Mondo from "@/main";
import { validateMondoConfig } from "@/utils/MondoConfigManager";
import { MONDO_ENTITY_CONFIG_LIST } from "@/entities";
import { createSettingsSection } from "./SettingsView_utils";

type SettingsFolderSetter = (v: string) => Promise<void>;
type SettingsFolderGetter = () => string;

interface SettingsEntitiesProps {
  app: App;
  plugin: Mondo;
  containerEl: HTMLElement;
  folderPaths: string[];
  addFolderSetting: (
    container: HTMLElement,
    name: string,
    desc: string,
    getValue: SettingsFolderGetter,
    setValue: SettingsFolderSetter
  ) => Setting;
  showErrorModal: (title: string, issues: string[]) => void;
  showRestartPrompt: () => Promise<boolean>;
}

class MarkdownFileSuggest extends AbstractInputSuggest<TFile> {
  private readonly onPick?: (file: TFile) => void | Promise<void>;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    onPick?: (file: TFile) => void | Promise<void>
  ) {
    super(app, inputEl);
    this.onPick = onPick;
  }

  getSuggestions(query: string): TFile[] {
    const files = this.app.vault.getMarkdownFiles();
    if (!query) {
      return files.slice(0, 50);
    }

    const normalized = query.toLowerCase();
    return files.filter((file) => file.path.toLowerCase().includes(normalized));
  }

  renderSuggestion(file: TFile, el: HTMLElement) {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile) {
    if (this.onPick) {
      try {
        void this.onPick(file);
      } catch (error) {
        // ignore persistence issues triggered during suggestion pick
      }
    } else {
      const input = (this as any).inputEl as HTMLInputElement | undefined;
      if (input) {
        input.value = file.path;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    try {
      (this as any).close();
    } catch (error) {
      // ignore inability to close suggest UI
    }
  }
}

class TemplatePickerModal extends FuzzySuggestModal<TFile> {
  private readonly onSelect: (file: TFile) => void | Promise<void>;

  constructor(app: App, onSelect: (file: TFile) => void | Promise<void>) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder("Select a template note");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile, _evt?: MouseEvent | KeyboardEvent) {
    try {
      void this.onSelect(file);
    } catch (error) {
      // ignore persistence errors raised by selection handler
    }
  }
}

class SimpleModal extends Modal {
  private readonly title: string;
  private readonly contentNodes: (HTMLElement | string)[];
  constructor(app: App, title: string, contents: (HTMLElement | string)[]) {
    super(app);
    this.title = title;
    this.contentNodes = contents;
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText(this.title);
    contentEl.empty();
    this.contentNodes.forEach((node) => {
      if (typeof node === "string") {
        const p = contentEl.createEl("p", { text: node });
        p.style.whiteSpace = "pre-wrap";
      } else {
        contentEl.appendChild(node);
      }
    });
    const footer = contentEl.createDiv({ cls: "modal-button-container" });
    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.addEventListener("click", () => this.close());
  }
}

const showErrorModal = (app: App, title: string, issues: string[]) => {
  const list = document.createElement("ul");
  list.style.paddingLeft = "1.2em";
  issues.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = msg;
    list.appendChild(li);
  });
  const modal = new SimpleModal(app, title, [list]);
  modal.open();
};

const confirmReset = async (app: App): Promise<boolean> => {
  return await new Promise<boolean>((resolve) => {
    class ConfirmModal extends Modal {
      onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText("Reset configuration?");
        contentEl.empty();
        contentEl.createEl("p", {
          text: "This will clear the custom JSON and restore the built-in defaults.",
        });
        const footer = contentEl.createDiv({
          cls: "modal-button-container",
        });
        const cancel = footer.createEl("button", { text: "Cancel" });
        const ok = footer.createEl("button", { text: "Reset" });
        ok.addClass("mod-warning");
        cancel.addEventListener("click", () => {
          this.close();
          resolve(false);
        });
        ok.addEventListener("click", () => {
          this.close();
          resolve(true);
        });
      }
    }
    new ConfirmModal(app).open();
  });
};

const showRestartPrompt = async (app: App): Promise<boolean> => {
  return await new Promise<boolean>((resolve) => {
    class RestartModal extends Modal {
      onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText("Restart required");
        contentEl.empty();
        contentEl.createEl("p", {
          text: "Your vault needs to be restarted for these changes to take effect. Restart now?",
        });
        const footer = contentEl.createDiv({
          cls: "modal-button-container",
        });
        const later = footer.createEl("button", {
          text: "I'll do it later",
        });
        const yes = footer.createEl("button", { text: "Yes" });
        yes.addClass("mod-cta");
        later.addEventListener("click", () => {
          this.close();
          resolve(false);
        });
        yes.addEventListener("click", () => {
          this.close();
          resolve(true);
        });
      }
    }
    new RestartModal(app).open();
  });
};

export const renderEntityConfigurationSection = async (
  props: SettingsEntitiesProps
): Promise<void> => {
  const {
    app,
    plugin,
    containerEl,
    addFolderSetting,
    showRestartPrompt: parentShowRestartPrompt,
  } = props;

  // Custom Mondo Configuration section
  const customConfigContainer = containerEl.createDiv();
  const customConfigSection = createSettingsSection(
    customConfigContainer,
    "Mondo Entities",
    "Paste JSON here to override the built-in Mondo Entities configuration.\nLeave empty to use defaults."
  );

  // Full-width block under the heading, rendered as a standard Setting row
  const configSetting = new Setting(customConfigContainer);
  try {
    // Hide the left info column so the control spans the full row width
    configSetting.infoEl.style.display = "none";
  } catch (_) {}
  const configBlock = configSetting.controlEl.createDiv();
  configBlock.style.width = "100%";

  const textArea = document.createElement("textarea");
  textArea.rows = 14;
  textArea.style.width = "100%";
  textArea.style.minHeight = "220px";
  textArea.style.fontFamily = "var(--font-monospace)";
  textArea.placeholder = '{\n  "entities": { ... }\n}';
  textArea.value = (plugin as any).settings?.mondoConfigJson ?? "";
  textArea.addEventListener("change", async () => {
    (plugin as any).settings.mondoConfigJson = textArea.value;
    await (plugin as any).saveSettings();
  });
  configBlock.appendChild(textArea);

  // Actions row aligned to the right
  const actionsRow = document.createElement("div");
  actionsRow.style.display = "flex";
  actionsRow.style.justifyContent = "flex-end";
  actionsRow.style.gap = "8px";
  actionsRow.style.marginTop = "10px";
  configBlock.appendChild(actionsRow);

  // Validate & Apply button
  const applyBtn = actionsRow.createEl("button", {
    text: "Validate & Apply",
  });
  applyBtn.addClass("mod-cta");
  applyBtn.addEventListener("click", async () => {
    const raw = (textArea.value ?? "").trim();
    if (!raw) {
      // Nothing to validate; delegate to plugin (applies defaults)
      await (plugin as any).applyMondoConfigFromSettings();
      await (plugin as any).saveSettings?.();
      if (await parentShowRestartPrompt()) {
        try {
          (app as any)?.commands?.executeCommandById?.("app:reload");
        } catch (_) {}
        try {
          window.location.reload();
        } catch (_) {}
      }
      return;
    }
    // Try to parse and validate ourselves so we can show a detailed modal on errors
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showErrorModal(app, "Invalid JSON", [msg]);
      return;
    }

    const result = validateMondoConfig(parsed);
    if (!result.ok) {
      const issues = result.issues.map((i) => `${i.path}: ${i.message}`);
      showErrorModal(app, "Configuration issues", issues);
      return;
    }

    await (plugin as any).applyMondoConfigFromSettings();
    await (plugin as any).saveSettings?.();

    if (await parentShowRestartPrompt()) {
      try {
        (app as any)?.commands?.executeCommandById?.("app:reload");
      } catch (_) {}
      try {
        window.location.reload();
      } catch (_) {}
    }
  });

  // Reset button (Use defaults)
  const resetBtn = actionsRow.createEl("button", { text: "Use defaults" });
  resetBtn.addEventListener("click", async () => {
    const confirmed = await confirmReset(app);
    if (!confirmed) return;
    (plugin as any).settings.mondoConfigJson = "";
    await (plugin as any).saveSettings();
    await (plugin as any).applyMondoConfigFromSettings();
    textArea.value = "";
    if (await parentShowRestartPrompt()) {
      try {
        (app as any)?.commands?.executeCommandById?.("app:reload");
      } catch (_) {}
      try {
        window.location.reload();
      } catch (_) {}
    }
  });

  // Only include actual configured entities; exclude special types like daily/log/journal
  const entityDefinitions = MONDO_ENTITY_CONFIG_LIST.map((cfg) => ({
    type: cfg.type,
    label: cfg.name ?? cfg.type,
  }));

  if (entityDefinitions.length > 0) {
    const entitiesToggleContainer = containerEl.createDiv(
      "mondo-settings-entities-toggle"
    );
    const entitiesToggleButton = entitiesToggleContainer.createEl("a", {
      text: "Show entities options",
    });
    entitiesToggleButton.addClass("mondo-settings-entities-toggle-link");
    entitiesToggleButton.setAttribute("href", "#");

    const entitiesContent = containerEl.createDiv("mondo-settings-entities");
    const entitiesContentId = "mondo-settings-entities-content";
    entitiesContent.setAttribute("id", entitiesContentId);
    entitiesToggleButton.setAttribute("aria-controls", entitiesContentId);
    entitiesToggleButton.setAttribute("aria-expanded", "false");

    let entitiesVisible = false;
    const applyEntitiesVisibility = (visible: boolean) => {
      entitiesVisible = visible;
      entitiesContent.toggleClass("is-hidden", !visible);
      entitiesContent.setAttribute("aria-hidden", visible ? "false" : "true");
      entitiesToggleButton.setText(
        visible ? "Hide entities options" : "Show entities options"
      );
      entitiesToggleButton.setAttribute(
        "aria-expanded",
        visible ? "true" : "false"
      );
    };

    applyEntitiesVisibility(false);

    entitiesToggleButton.addEventListener("click", (event) => {
      event.preventDefault();
      applyEntitiesVisibility(!entitiesVisible);
    });

    for (const { label, type } of entityDefinitions) {
      const section = entitiesContent.createDiv("mondo-settings-entity");
      new Setting(section).setName(label).setHeading();

      addFolderSetting(
        section,
        "Documents Store",
        "Pick a folder in which to store all the documents for this entity",
        () => (plugin as any).settings.rootPaths[type],
        async (v) => {
          (plugin as any).settings.rootPaths[type] = v || "/";
          await (plugin as any).saveSettings();
        }
      );

      const getStoredTemplatePath = (): string =>
        ((plugin as any).settings.templates?.[type] ?? "") as string;

      const persistTemplatePath = async (raw: string) => {
        (plugin as any).settings.templates =
          (plugin as any).settings.templates || {};

        const normalized =
          raw.includes("\n") || raw.includes("{{") || raw.includes("---")
            ? raw
            : raw.trim();
        const current = ((plugin as any).settings.templates?.[type] ??
          "") as string;

        if (current === normalized) {
          return;
        }

        (plugin as any).settings.templates[type] = normalized;
        await (plugin as any).saveSettings();
      };

      let syncTemplateInput = false;
      let applyTemplateInput: ((value: string) => void) | null = null;

      const updateTemplatePath = async (value: string) => {
        await persistTemplatePath(value);
        if (applyTemplateInput) {
          applyTemplateInput(value);
        }
      };

      new Setting(section)
        .setName("Custom Template")
        .setDesc("Pick a note to copy over whenever creating a new entity")
        .addSearch((search) => {
          const showPicker = () => {
            const modal = new TemplatePickerModal(app, async (file) => {
              await updateTemplatePath(file.path);
            });

            modal.open();
          };

          search
            .setPlaceholder("Select a template note…")
            .setValue(getStoredTemplatePath())
            .onChange(async (value) => {
              if (syncTemplateInput) {
                return;
              }

              await persistTemplatePath(value);
            });

          applyTemplateInput = (value: string) => {
            syncTemplateInput = true;
            try {
              search.setValue(value);
            } catch (error) {
              search.inputEl.value = value;
              search.inputEl.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              search.inputEl.dispatchEvent(
                new Event("change", { bubbles: true })
              );
            } finally {
              syncTemplateInput = false;
            }
          };

          const buttonEl = (search as any).buttonEl as
            | HTMLButtonElement
            | undefined;

          if (buttonEl) {
            buttonEl.setAttribute("aria-label", "Browse template notes");
            buttonEl.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              showPicker();
            });
          }

          try {
            const suggester = new MarkdownFileSuggest(
              app,
              search.inputEl as HTMLInputElement,
              async (file) => {
                await updateTemplatePath(file.path);
              }
            );
            (props as any)._suggesters = (props as any)._suggesters || [];
            (props as any)._suggesters.push(suggester);
          } catch (error) {
            // ignore suggest attachment issues
          }
        });
    }

    // Add separator inside the entities content div so it only shows when expanded
    const entitiesSeparator = entitiesContent.createEl("hr");
    entitiesSeparator.style.margin = "24px 0";
    entitiesSeparator.style.opacity = "0.5";
  }
};
