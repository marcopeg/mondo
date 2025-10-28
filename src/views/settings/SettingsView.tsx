import {
  PluginSettingTab,
  Setting,
  App,
  Modal,
  TFolder,
  AbstractInputSuggest,
} from "obsidian";
import type CRM from "@/main";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import {
  DEFAULT_TIMESTAMP_SETTINGS,
  normalizeTimestampSettings,
} from "@/types/TimestampSettings";
import { renderEntityConfigurationSection } from "./SettingsView_Entities";
import { renderGeneralSection } from "./SettingsView_General";
import { renderTimestampsSection } from "./SettingsView_Timestamps";
import { renderAudioSection } from "./SettingsView_Audio";
import { renderDailySection } from "./SettingsView_Daily";
import { renderJournalSection } from "./SettingsView_Journal";
import { renderDashboardSection } from "./SettingsView_Dashboard";

// Settings view for CRM plugin
export class SettingsView extends PluginSettingTab {
  plugin: CRM;

  constructor(app: App, plugin: CRM) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    // Ensure settings object exists
    (this.plugin as any).settings = (this.plugin as any).settings ?? {
      // Initialize only with entity types; special types (daily, journal, etc.) have dedicated sections below
      rootPaths: Object.fromEntries(
        CRM_ENTITY_CONFIG_LIST.map((cfg) => [String(cfg.type), "/"])
      ),
    };
    // Ensure journal/daily settings exist with sensible defaults
    (this.plugin as any).settings.inbox =
      (this.plugin as any).settings.inbox ?? "Inbox";
    (this.plugin as any).settings.journal = (this.plugin as any).settings
      .journal ?? { root: "Journal", entry: "YYYY-MM-DD" };
    (this.plugin as any).settings.daily = (this.plugin as any).settings
      .daily ?? { root: "Daily", entry: "YYYY-MM-DD", note: "HH:MM" };
    (this.plugin as any).settings.templates =
      (this.plugin as any).settings.templates ??
      Object.fromEntries(
        CRM_ENTITY_CONFIG_LIST.map((cfg) => [String(cfg.type), ""])
      );
    (this.plugin as any).settings.openAITranscriptionPolishEnabled =
      typeof (this.plugin as any).settings.openAITranscriptionPolishEnabled ===
      "boolean"
        ? (this.plugin as any).settings.openAITranscriptionPolishEnabled
        : true;
    (this.plugin as any).settings.timestamp = normalizeTimestampSettings(
      (this.plugin as any).settings.timestamp ?? DEFAULT_TIMESTAMP_SETTINGS
    );
    const dashboardSettings = (this.plugin as any).settings.dashboard ?? {};
    (this.plugin as any).settings.dashboard = {
      openAtBoot: dashboardSettings.openAtBoot === true,
      forceTab: dashboardSettings.forceTab === true,
      enableQuickTasks: dashboardSettings.enableQuickTasks !== false,
      enableRelevantNotes:
        dashboardSettings.enableRelevantNotes !== false,
      enableStats: dashboardSettings.enableStats !== false,
    };
    // Helper: collect folder paths from the vault
    const collectFolderPaths = (
      root: TFolder,
      out: string[] = []
    ): string[] => {
      out.push(root.path === "" ? "/" : root.path);
      for (const child of root.children) {
        if (child instanceof TFolder) collectFolderPaths(child as TFolder, out);
      }
      return out;
    };

    // Use Obsidian's AbstractInputSuggest pattern via Setting.addSearch for native UX
    const folderPaths = collectFolderPaths(this.app.vault.getRoot() as TFolder);

    // Implement a suggest class for the input element using API export
    class FolderSuggest extends AbstractInputSuggest<string> {
      private _onPick?: (item: string) => void;
      constructor(
        app: App,
        inputEl: HTMLInputElement,
        onPick?: (item: string) => void
      ) {
        super(app, inputEl);
        this._onPick = onPick;
      }

      getSuggestions(query: string): string[] {
        const q = query.toLowerCase();
        return folderPaths.filter((p) => p.toLowerCase().includes(q));
      }

      renderSuggestion(item: string, el: HTMLElement): void {
        el.setText(item);
      }

      selectSuggestion(item: string): void {
        // Prefer callback to set the value via the SearchComponent
        if (this._onPick) {
          try {
            this._onPick(item);
          } catch (e) {
            // ignore
          }
        } else {
          const input = (this as any).inputEl as HTMLInputElement | undefined;
          if (input) {
            input.value = item;
            // Trigger input/change so Setting.onChange handlers fire
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        // Close the suggest UI
        try {
          (this as any).close();
        } catch (e) {
          // ignore
        }
      }
    }

    const addFolderSetting = (
      container: HTMLElement | (() => Setting),
      name: string,
      desc: string,
      getValue: () => string,
      setValue: (v: string) => Promise<void>
    ): Setting => {
      const createSetting =
        container instanceof HTMLElement
          ? () => new Setting(container)
          : container;

      const setting = createSetting().setName(name).setDesc(desc);

      setting.addSearch((s) => {
        s.setPlaceholder("/")
          .setValue(getValue() ?? "/")
          .onChange(async (v) => {
            await setValue(v || "/");
          });

        // Attach native suggest to the input element
        // AbstractInputSuggest expects the global Obsidian to exist
        try {
          const sugg = new FolderSuggest(
            this.app,
            s.inputEl as HTMLInputElement,
            async (picked: string) => {
              // Update UI
              try {
                s.setValue(picked);
              } catch (e) {
                s.inputEl.value = picked;
                s.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                s.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
              }

              // Persist via the provided setter
              try {
                await setValue(picked || "/");
              } catch (e) {
                // ignore persistence errors here
              }
            }
          );
          // Keep a reference to avoid GC and allow later cleanup
          (this as any)._suggesters = (this as any)._suggesters || [];
          (this as any)._suggesters.push(sugg);
        } catch (e) {
          // Fallback: no suggest available
        }
      });

      return setting;
    };

    // Modal helper
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

    const showErrorModal = (title: string, issues: string[]): void => {
      const list = document.createElement("ul");
      list.style.paddingLeft = "1.2em";
      issues.forEach((msg) => {
        const li = document.createElement("li");
        li.textContent = msg;
        list.appendChild(li);
      });
      const modal = new SimpleModal(this.app, title, [list]);
      modal.open();
    };

    const showRestartPrompt = async (): Promise<boolean> => {
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
        new RestartModal(this.app).open();
      });
    };

    // Render sections
    renderGeneralSection({
      app: this.app,
      plugin: this.plugin,
      containerEl,
    });

    renderDashboardSection({
      plugin: this.plugin,
      containerEl,
    });

    // Render timestamp section
    renderTimestampsSection({
      plugin: this.plugin,
      containerEl,
    });

    // Render audio section
    renderAudioSection({
      plugin: this.plugin,
      containerEl,
    });

    // Render daily section
    renderDailySection({
      plugin: this.plugin,
      containerEl,
      addFolderSetting,
    });

    // Render journal section
    renderJournalSection({
      plugin: this.plugin,
      containerEl,
      addFolderSetting,
      onDisplayUpdate: () => this.display(),
    });

    // Render entity configuration and custom CRM configuration sections
    await renderEntityConfigurationSection({
      app: this.app,
      plugin: this.plugin,
      containerEl,
      folderPaths,
      addFolderSetting,
      showErrorModal,
      showRestartPrompt,
    });
  }
}
