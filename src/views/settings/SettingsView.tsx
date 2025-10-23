import {
  PluginSettingTab,
  Setting,
  App,
  TFolder,
  TFile,
  AbstractInputSuggest,
  Notice,
  type ExtraButtonComponent,
  FuzzySuggestModal,
  type FuzzyMatch,
} from "obsidian";
import type CRM from "@/main";
import {
  CRMFileType,
  CRM_FILE_TYPES,
  getCRMEntityConfig,
} from "@/types/CRMFileType";

// Settings view for CRM plugin
export class SettingsView extends PluginSettingTab {
  plugin: CRM;

  constructor(app: App, plugin: CRM) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Ensure settings object exists
    (this.plugin as any).settings = (this.plugin as any).settings ?? {
      rootPaths: Object.fromEntries(
        CRM_FILE_TYPES.map((t) => [String(t), "/"])
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
      Object.fromEntries(CRM_FILE_TYPES.map((t) => [String(t), ""]));
    (this.plugin as any).settings.openAITranscriptionPolishEnabled =
      typeof (this.plugin as any).settings.openAITranscriptionPolishEnabled ===
      "boolean"
        ? (this.plugin as any).settings.openAITranscriptionPolishEnabled
        : true;
    // Helper: collect folder paths from the vault
    const collectFolderPaths = (root: TFolder, out: string[] = []) => {
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

      getSuggestions(query: string) {
        const q = query.toLowerCase();
        return folderPaths.filter((p) => p.toLowerCase().includes(q));
      }

      renderSuggestion(item: string, el: HTMLElement) {
        el.setText(item);
      }

      selectSuggestion(item: string) {
        // Prefer callback to set the value via the SearchComponent
        if (this._onPick) {
          try {
            this._onPick(item);
          } catch (e) {}
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
        return files.filter((file) =>
          file.path.toLowerCase().includes(normalized)
        );
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

    type PersonEntry = {
      path: string;
      label: string;
      search: string;
    };

    const collectPersonEntries = (): PersonEntry[] => {
      const markdownFiles = this.app.vault.getMarkdownFiles();
      return markdownFiles
        .map((file) => {
          const cache = this.app.metadataCache.getFileCache(file);
          const frontmatter = cache?.frontmatter as
            | Record<string, unknown>
            | undefined;
          const type =
            typeof frontmatter?.type === "string"
              ? frontmatter.type.trim().toLowerCase()
              : "";
          if (type !== CRMFileType.PERSON) {
            return null;
          }
          const show =
            typeof frontmatter?.show === "string"
              ? frontmatter.show.trim()
              : "";
          const name =
            typeof frontmatter?.name === "string"
              ? frontmatter.name.trim()
              : "";
          const label = show || name || file.basename;
          const path = file.path;
          return {
            path,
            label,
            search: `${label.toLowerCase()} ${path.toLowerCase()}`,
          } as PersonEntry;
        })
        .filter((entry): entry is PersonEntry => Boolean(entry))
        .sort((first, second) =>
          first.label.localeCompare(second.label, undefined, {
            sensitivity: "base",
          })
        );
    };

    const findPersonEntry = (value: string): PersonEntry | null => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const entries = collectPersonEntries();
      const normalized = trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
      const normalizedNoExt = normalized.replace(/\.md$/iu, "");
      return (
        entries.find((entry) => {
          const entryNoExt = entry.path.replace(/\.md$/iu, "");
          return (
            entry.path === trimmed ||
            entry.path === normalized ||
            entryNoExt === trimmed ||
            entryNoExt === normalizedNoExt
          );
        }) ?? null
      );
    };

    const renderPersonSuggestion = (item: PersonEntry, el: HTMLElement) => {
      el.empty();
      el.createEl("div", {
        text: item.label,
        cls: "crm-settings-person-label",
      });
      if (item.path !== item.label) {
        el.createEl("div", {
          text: item.path,
          cls: "crm-settings-person-path",
        });
      }
    };

    class PersonSuggest extends AbstractInputSuggest<PersonEntry> {
      private readonly getEntries: () => PersonEntry[];
      // Use a distinct name to avoid conflicting with AbstractInputSuggest.onSelect method signature
      private readonly handleSelect?: (
        entry: PersonEntry
      ) => void | Promise<void>;

      constructor(
        app: App,
        inputEl: HTMLInputElement,
        getEntries: () => PersonEntry[],
        onSelect?: (entry: PersonEntry) => void | Promise<void>
      ) {
        super(app, inputEl);
        this.getEntries = getEntries;
        this.handleSelect = onSelect;
      }

      getSuggestions(query: string) {
        const entries = this.getEntries();
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
          return entries;
        }
        return entries.filter((entry) => entry.search.includes(normalized));
      }

      renderSuggestion(item: PersonEntry, el: HTMLElement) {
        renderPersonSuggestion(item, el);
      }

      selectSuggestion(item: PersonEntry) {
        if (this.handleSelect) {
          try {
            void this.handleSelect(item);
          } catch (error) {
            // ignore persistence errors from select callback
          }
        }

        this.close();
      }
    }

    class PersonPickerModal extends FuzzySuggestModal<PersonEntry> {
      private readonly getEntries: () => PersonEntry[];
      private readonly onSelect: (entry: PersonEntry) => void | Promise<void>;

      constructor(
        app: App,
        getEntries: () => PersonEntry[],
        onSelect: (entry: PersonEntry) => void | Promise<void>
      ) {
        super(app);
        this.getEntries = getEntries;
        this.onSelect = onSelect;
        this.setPlaceholder("Select a person note");
      }

      getItems(): PersonEntry[] {
        return this.getEntries();
      }

      getItemText(item: PersonEntry): string {
        return item.label;
      }

      renderSuggestion(match: FuzzyMatch<PersonEntry>, el: HTMLElement) {
        renderPersonSuggestion(match.item, el);
      }

      onChooseItem(item: PersonEntry, _evt?: MouseEvent | KeyboardEvent) {
        try {
          void this.onSelect(item);
        } catch (error) {
          // ignore persistence errors from select callback
        }
      }
    }

    const addFolderSetting = (
      container: HTMLElement,
      name: string,
      desc: string,
      getValue: () => string,
      setValue: (v: string) => Promise<void>
    ) => {
      new Setting(container)
        .setName(name)
        .setDesc(desc)
        .addSearch((s) => {
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
                  s.inputEl.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  s.inputEl.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
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
    };

    const entityDefinitions = CRM_FILE_TYPES.map((type) => {
      const config = getCRMEntityConfig(type);
      return {
        type,
        label: config?.name ?? type,
      };
    });

    const addSelfPersonSetting = (container: HTMLElement) => {
      const storedSelfPath = (
        (this.plugin as any).settings?.selfPersonPath?.toString?.() ?? ""
      ).trim();

      const selfSetting = new Setting(container)
        .setName("Who's me?")
        .setDesc(
          'Pick a person that will be used to mean "myself" in the CRM.'
        );

      selfSetting.addSearch((search) => {
        const applyStoredValue = (value: string) => {
          try {
            search.setValue(value);
          } catch (error) {
            search.inputEl.value = value;
            search.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            search.inputEl.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
        };

        const persistSelfPersonPath = async (path: string) => {
          const normalized = path.trim();
          if ((this.plugin as any).settings.selfPersonPath !== normalized) {
            (this.plugin as any).settings.selfPersonPath = normalized;
            await (this.plugin as any).saveSettings();
          }
        };

        const applyPersonSelection = async (entry: PersonEntry) => {
          if (search.inputEl.value !== entry.path) {
            applyStoredValue(entry.path);
          }
          await persistSelfPersonPath(entry.path);
        };

        const clearSelfPerson = async () => {
          if ((this.plugin as any).settings.selfPersonPath) {
            (this.plugin as any).settings.selfPersonPath = "";
            await (this.plugin as any).saveSettings();
          }
        };

        search
          .setPlaceholder("Select a person note…")
          .setValue(storedSelfPath)
          .onChange(async (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              await clearSelfPerson();
              return;
            }

            const entry = findPersonEntry(trimmed);
            if (!entry) {
              return;
            }

            await applyPersonSelection(entry);
          });

        const buttonEl = (search as any).buttonEl as
          | HTMLButtonElement
          | undefined;
        if (buttonEl) {
          buttonEl.setAttribute("aria-label", "Select a person note");
          buttonEl.setAttribute("title", "Select a person note");
          buttonEl.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const modal = new PersonPickerModal(
              this.app,
              collectPersonEntries,
              async (entry) => {
                await applyPersonSelection(entry);
              }
            );
            modal.open();
            return false;
          };
        }

        try {
          const suggest = new PersonSuggest(
            this.app,
            search.inputEl as HTMLInputElement,
            collectPersonEntries,
            async (entry) => {
              await applyPersonSelection(entry);
            }
          );
          (this as any)._suggesters = (this as any)._suggesters || [];
          (this as any)._suggesters.push(suggest);
        } catch (error) {
          // Suggest is unavailable (e.g. tests); ignore.
        }

        try {
          const clearButton = (search as any).clearButtonEl as
            | HTMLButtonElement
            | undefined;
          if (clearButton) {
            clearButton.onclick = async (event) => {
              event.preventDefault();
              event.stopPropagation();
              search.setValue("");
              await clearSelfPerson();
              return false;
            };
          }
        } catch (error) {
          // Ignore issues while wiring the clear button.
        }
      });
    };

    const entitiesToggleContainer = containerEl.createDiv(
      "crm-settings-entities-toggle"
    );
    const entitiesToggleButton = entitiesToggleContainer.createEl("button", {
      text: "Show entities options",
    });
    entitiesToggleButton.addClass("crm-settings-entities-toggle-button");
    entitiesToggleButton.setAttribute("type", "button");

    const entitiesContent = containerEl.createDiv("crm-settings-entities");
    const entitiesContentId = "crm-settings-entities-content";
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

    entitiesToggleButton.addEventListener("click", () => {
      applyEntitiesVisibility(!entitiesVisible);
    });

    for (const { label, type } of entityDefinitions) {
      const section = entitiesContent.createDiv("crm-settings-entity");
      new Setting(section).setName(label).setHeading();

      addFolderSetting(
        section,
        "Documents Store",
        "Pick a folder in which to store all the documents for this entity",
        () => (this.plugin as any).settings.rootPaths[type],
        async (v) => {
          (this.plugin as any).settings.rootPaths[type] = v || "/";
          await (this.plugin as any).saveSettings();
        }
      );

      const getStoredTemplatePath = (): string =>
        ((this.plugin as any).settings.templates?.[type] ?? "") as string;

      const persistTemplatePath = async (raw: string) => {
        (this.plugin as any).settings.templates =
          (this.plugin as any).settings.templates || {};

        const normalized =
          raw.includes("\n") || raw.includes("{{") || raw.includes("---")
            ? raw
            : raw.trim();
        const current = ((this.plugin as any).settings.templates?.[type] ??
          "") as string;

        if (current === normalized) {
          return;
        }

        (this.plugin as any).settings.templates[type] = normalized;
        await (this.plugin as any).saveSettings();
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
            const modal = new TemplatePickerModal(this.app, async (file) => {
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
              this.app,
              search.inputEl as HTMLInputElement,
              async (file) => {
                await updateTemplatePath(file.path);
              }
            );
            (this as any)._suggesters = (this as any)._suggesters || [];
            (this as any)._suggesters.push(suggester);
          } catch (error) {
            // ignore suggest attachment issues
          }
        });

      if (type === CRMFileType.PERSON) {
        addSelfPersonSetting(section);
      }
    }

    const audioSettingsSection = containerEl.createDiv(
      "crm-settings-section"
    );

    new Setting(audioSettingsSection)
      .setName("Audio Transcription")
      .setDesc("Configure AI transcription for embedded audio.")
      .setHeading();

    new Setting(audioSettingsSection)
      .setName("OpenAI Whisper API key")
      .setDesc(
        "Used to transcribe embedded audio with OpenAI Whisper-compatible models."
      )
      .addText((text) => {
        text
          .setPlaceholder("sk-...")
          .setValue(
            (this.plugin as any).settings.openAIWhisperApiKey?.toString?.() ??
              ""
          )
          .onChange(async (value) => {
            (this.plugin as any).settings.openAIWhisperApiKey = value.trim();
            await (this.plugin as any).saveSettings();
          });

        try {
          (text.inputEl as HTMLInputElement).type = "password";
        } catch (e) {}
      });

    new Setting(audioSettingsSection)
      .setName("OpenAI model")
      .setDesc("Model used to polish dictated voice notes before insertion.")
      .addDropdown((dropdown) => {
        const models = ["gpt-5", "gpt-5-mini", "gpt-5-nano"];
        models.forEach((model) => {
          dropdown.addOption(model, model);
        });

        const current =
          (this.plugin as any).settings.openAIModel?.toString?.() ??
          "gpt-5-nano";

        if (!models.includes(current)) {
          dropdown.setValue("gpt-5-nano");
          (this.plugin as any).settings.openAIModel = "gpt-5-nano";
          void (this.plugin as any).saveSettings();
        } else {
          dropdown.setValue(current);
        }

        dropdown.onChange(async (value) => {
          (this.plugin as any).settings.openAIModel = value;
          await (this.plugin as any).saveSettings();
        });
      });

    new Setting(audioSettingsSection)
      .setName("Polish transcriptions with AI")
      .setDesc(
        "When enabled, dictated notes are refined by the selected OpenAI model before insertion."
      )
      .addToggle((toggle) => {
        const current =
          (this.plugin as any).settings.openAITranscriptionPolishEnabled !==
          false;
        toggle.setValue(current).onChange(async (value) => {
          (this.plugin as any).settings.openAITranscriptionPolishEnabled =
            value;
          await (this.plugin as any).saveSettings();
        });
      });

    const voiceManager = this.plugin.getVoiceoverManager?.();
    const voicePreviewTooltip = "Preview the selected voice";

    const voiceoverSettingsSection = containerEl.createDiv(
      "crm-settings-section"
    );

    new Setting(voiceoverSettingsSection)
      .setName("Voiceover")
      .setDesc("Configure AI-generated voiceovers.")
      .setHeading();

    new Setting(voiceoverSettingsSection)
      .setName("Voiceover media cache")
      .setDesc(
        "Vault-relative folder where generated voiceovers are stored. The folder will be created when needed."
      )
      .addSearch((search) => {
        const fallback = "/voiceover";
        const stored =
          (this.plugin as any).settings.voiceoverCachePath?.toString?.() ??
          fallback;

        const applyValue = async (raw: string) => {
          const trimmed = raw?.trim?.() ?? "";
          const resolved = trimmed || fallback;
          (this.plugin as any).settings.voiceoverCachePath = resolved;
          await (this.plugin as any).saveSettings();
          if (search.inputEl.value !== resolved) {
            try {
              search.setValue(resolved);
            } catch (error) {
              search.inputEl.value = resolved;
              search.inputEl.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              search.inputEl.dispatchEvent(
                new Event("change", { bubbles: true })
              );
            }
          }
        };

        search
          .setPlaceholder(fallback)
          .setValue(stored || fallback)
          .onChange(async (value) => {
            await applyValue(value);
          });

        try {
          const sugg = new FolderSuggest(
            this.app,
            search.inputEl as HTMLInputElement,
            async (picked: string) => {
              const resolved = picked || fallback;

              try {
                search.setValue(resolved);
              } catch (error) {
                search.inputEl.value = resolved;
                search.inputEl.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                search.inputEl.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
              }

              await applyValue(resolved);
            }
          );

          (this as any)._suggesters = (this as any)._suggesters || [];
          (this as any)._suggesters.push(sugg);
        } catch (error) {
          // Suggest is unavailable (e.g. tests); ignore.
        }
      });

    let previewState = { disabled: true, tooltip: voicePreviewTooltip };
    let previewButton: ExtraButtonComponent | null = null;
    const applyPreviewState = () => {
      if (!previewButton) {
        return;
      }

      previewButton.setDisabled(previewState.disabled);
      previewButton.setTooltip(previewState.tooltip);
      previewButton.setIcon("play");
    };
    const setPreviewState = (disabled: boolean, tooltip: string) => {
      previewState = { disabled, tooltip };
      applyPreviewState();
    };
    let voiceSelect: HTMLSelectElement | null = null;

    new Setting(voiceoverSettingsSection)
      .setName("Voiceover voice")
      .setDesc(
        "Select the OpenAI voice used when generating audio from selected text."
      )
      .addDropdown((dropdown) => {
        const apiKey = (
          this.plugin as any
        ).settings.openAIWhisperApiKey?.trim?.();
        const currentVoice = (this.plugin as any).settings.openAIVoice ?? "";

        voiceSelect = dropdown.selectEl;

        dropdown.onChange(async (value) => {
          (this.plugin as any).settings.openAIVoice = value;
          await (this.plugin as any).saveSettings();
        });

        const setOptions = (
          voices: string[],
          disabled: boolean,
          placeholder: string
        ) => {
          const select = dropdown.selectEl;
          while (select.firstChild) {
            select.removeChild(select.firstChild);
          }

          if (voices.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = placeholder;
            select.appendChild(option);
            dropdown.setValue("");
            dropdown.setDisabled(true);
            setPreviewState(true, placeholder);
            return;
          }

          voices.forEach((voice) => {
            const option = document.createElement("option");
            option.value = voice;
            option.textContent = voice;
            select.appendChild(option);
          });

          const initial =
            currentVoice && voices.includes(currentVoice)
              ? currentVoice
              : voices[0];
          dropdown.setValue(initial);
          dropdown.setDisabled(disabled);

          setPreviewState(
            disabled,
            disabled ? placeholder : voicePreviewTooltip
          );

          if (!currentVoice || !voices.includes(currentVoice)) {
            (this.plugin as any).settings.openAIVoice = initial;
            void (this.plugin as any).saveSettings();
          }
        };

        if (!apiKey || !voiceManager) {
          setOptions([], true, "Set an OpenAI API key to load voices");
          return;
        }

        dropdown.setDisabled(true);
        const loadingOption = document.createElement("option");
        loadingOption.value = "";
        loadingOption.textContent = "Loading voices…";
        dropdown.selectEl.appendChild(loadingOption);
        dropdown.setValue("");

        setPreviewState(true, "Loading voices…");

        void voiceManager
          .getAvailableVoices()
          .then((voices) => {
            setOptions(voices, false, "No voices available");
          })
          .catch((error) => {
            console.error("CRM: unable to populate voice options", error);
            setOptions([], true, "Failed to load voices");
            setPreviewState(true, "Failed to load voices");
          });
      })
      .addExtraButton((button) => {
        previewButton = button;
        applyPreviewState();

        button.onClick(async () => {
          const selected = voiceSelect?.value?.trim?.() ?? "";

          if (!selected) {
            new Notice("Select a voice before previewing.");
            return;
          }

          if (!voiceManager) {
            new Notice(
              "Voice preview is unavailable because the voiceover manager is not initialized."
            );
            return;
          }

          previewButton?.setDisabled(true);
          previewButton?.setIcon("loader-2");
          previewButton?.setTooltip("Loading preview…");

          try {
            await voiceManager.previewVoice(selected);
          } catch (error) {
            const message =
              error instanceof Error && error.message
                ? error.message
                : "Failed to preview voice.";
            console.error("CRM: voice preview failed", error);
            new Notice(`Voice preview failed: ${message}`);
          } finally {
            applyPreviewState();
          }
        });
      });

    const dailySettingsSection = containerEl.createDiv("crm-settings-section");

    // Daily Logs section
    new Setting(dailySettingsSection)
      .setName("Daily Logs")
      .setDesc("Settings for Daily Logs")
      .setHeading();

    addFolderSetting(
      dailySettingsSection,
      "Daily root",
      "Where do you want to store your Daily Logs?\n(Default: Daily)",
      () => (this.plugin as any).settings.daily?.root ?? "Daily",
      async (v) => {
        (this.plugin as any).settings.daily =
          (this.plugin as any).settings.daily || {};
        (this.plugin as any).settings.daily.root = v || "Daily";
        await (this.plugin as any).saveSettings();
      }
    );

    new Setting(dailySettingsSection)
      .setName("Entry format")
      .setDesc("Filename format for daily entries (default: YYYY-MM-DD)")
      .addText((t) => {
        t.setPlaceholder("YYYY-MM-DD")
          .setValue((this.plugin as any).settings.daily?.entry ?? "YYYY-MM-DD")
          .onChange(async (v) => {
            (this.plugin as any).settings.daily =
              (this.plugin as any).settings.daily || {};
            (this.plugin as any).settings.daily.entry = v || "YYYY-MM-DD";
            await (this.plugin as any).saveSettings();
          });
        try {
          (t.inputEl as HTMLInputElement).style.textAlign = "right";
        } catch (e) {}
      });

    new Setting(dailySettingsSection)
      .setName("Section Level")
      .setDesc("Heading level used for daily notes (default: h2)")
      .addDropdown((d) => {
        const opts: Record<string, string> = {
          h1: "H1",
          h2: "H2",
          h3: "H3",
          h4: "H4",
          h5: "H5",
          h6: "H6",
        };
        const current = (this.plugin as any).settings.daily?.section ?? "h2";
        d.addOptions(opts)
          .setValue(current)
          .onChange(async (v) => {
            (this.plugin as any).settings.daily =
              (this.plugin as any).settings.daily || {};
            (this.plugin as any).settings.daily.section = v;
            await (this.plugin as any).saveSettings();
          });
      });

    new Setting(dailySettingsSection)
      .setName("Section Title")
      .setDesc("Time format for notes inside daily logs (default: HH:MM)")
      .addText((t) => {
        t.setPlaceholder("HH:MM")
          .setValue((this.plugin as any).settings.daily?.note ?? "HH:MM")
          .onChange(async (v) => {
            (this.plugin as any).settings.daily =
              (this.plugin as any).settings.daily || {};
            (this.plugin as any).settings.daily.note = v || "HH:MM";
            await (this.plugin as any).saveSettings();
          });
        try {
          (t.inputEl as HTMLInputElement).style.textAlign = "right";
        } catch (e) {}
      });

    // New: toggle for inserting bullets in daily logs
    const dailyUseBullets = (this.plugin as any).settings.daily?.useBullets;
    new Setting(dailySettingsSection)
      .setName("Use bullets for entries")
      .setDesc(
        "If enabled, new daily entries will be prefixed with a bullet ('- ')."
      )
      .addToggle((t) => {
        t.setValue(dailyUseBullets ?? true).onChange(async (v) => {
          (this.plugin as any).settings.daily =
            (this.plugin as any).settings.daily || {};
          (this.plugin as any).settings.daily.useBullets = v;
          await (this.plugin as any).saveSettings();
        });
      });

    // Journal section
    const journalSettingsSection = containerEl.createDiv(
      "crm-settings-section"
    );

    new Setting(journalSettingsSection)
      .setName("Journal")
      .setDesc("Settings for the Journal feature")
      .setHeading();

    addFolderSetting(
      journalSettingsSection,
      "Journal root",
      "Where do you want to store your Journaling notes?\n(Default: Journal)",
      () => (this.plugin as any).settings.journal?.root ?? "Journal",
      async (v) => {
        (this.plugin as any).settings.journal =
          (this.plugin as any).settings.journal || {};
        (this.plugin as any).settings.journal.root = v || "Journal";
        await (this.plugin as any).saveSettings();
      }
    );

    new Setting(journalSettingsSection)
      .setName("Entry format")
      .setDesc("Filename format for journal entries (default: YYYY-MM-DD)")
      .addText((t) => {
        t.setPlaceholder("YYYY-MM-DD")
          .setValue(
            (this.plugin as any).settings.journal?.entry ?? "YYYY-MM-DD"
          )
          .onChange(async (v) => {
            (this.plugin as any).settings.journal =
              (this.plugin as any).settings.journal || {};
            (this.plugin as any).settings.journal.entry = v || "YYYY-MM-DD";
            await (this.plugin as any).saveSettings();
          });
        try {
          (t.inputEl as HTMLInputElement).style.textAlign = "right";
        } catch (e) {}
      });

    // Journal sections toggle + conditional settings
    const journalUseSections =
      (this.plugin as any).settings.journal?.useSections ?? false;

    new Setting(journalSettingsSection)
      .setName("Enable Sections")
      .setDesc("Organize your journal by time entries")
      .addToggle((t) => {
        t.setValue(journalUseSections).onChange(async (v) => {
          (this.plugin as any).settings.journal =
            (this.plugin as any).settings.journal || {};
          (this.plugin as any).settings.journal.useSections = v;
          await (this.plugin as any).saveSettings();
          // Re-render settings so conditional fields appear/disappear
          this.display();
        });
      });

    if (journalUseSections) {
      new Setting(journalSettingsSection)
        .setName("Section Level")
        .setDesc("Heading level used for journal notes (default: h3)")
        .addDropdown((d) => {
          const opts: Record<string, string> = {
            inline: "Inline",
            h1: "H1",
            h2: "H2",
            h3: "H3",
            h4: "H4",
            h5: "H5",
            h6: "H6",
          };
          const current =
            (this.plugin as any).settings.journal?.section ?? "h3";
          d.addOptions(opts)
            .setValue(current)
            .onChange(async (v) => {
              (this.plugin as any).settings.journal =
                (this.plugin as any).settings.journal || {};
              (this.plugin as any).settings.journal.section = v;
              await (this.plugin as any).saveSettings();
            });
        });

      new Setting(journalSettingsSection)
        .setName("Section Title")
        .setDesc(
          "Time format for notes inside journal entries (default: HH:MM)"
        )
        .addText((t) => {
          t.setPlaceholder("HH:MM")
            .setValue((this.plugin as any).settings.journal?.note ?? "HH:MM")
            .onChange(async (v) => {
              (this.plugin as any).settings.journal =
                (this.plugin as any).settings.journal || {};
              (this.plugin as any).settings.journal.note = v || "HH:MM";
              await (this.plugin as any).saveSettings();
            });
          try {
            (t.inputEl as HTMLInputElement).style.textAlign = "right";
          } catch (e) {}
        });
    }
  }
}
