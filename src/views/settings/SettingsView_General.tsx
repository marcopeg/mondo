import {
  App,
  AbstractInputSuggest,
  FuzzySuggestModal,
  Setting,
  type FuzzyMatch,
} from "obsidian";
import type Mondo from "@/main";
import { createSettingsSection } from "./SettingsView_utils";

type PersonEntry = {
  path: string;
  label: string;
  search: string;
};

interface SettingsGeneralProps {
  app: App;
  plugin: Mondo;
  containerEl: HTMLElement;
}

const collectPersonEntries = (app: App): PersonEntry[] => {
  const markdownFiles = app.vault.getMarkdownFiles();
  return markdownFiles
    .map((file) => {
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter as
        | Record<string, unknown>
        | undefined;
      const type =
        typeof frontmatter?.type === "string"
          ? frontmatter.type.trim().toLowerCase()
          : "";
      if (type !== "person") {
        return null;
      }
      const show =
        typeof frontmatter?.show === "string" ? frontmatter.show.trim() : "";
      const name =
        typeof frontmatter?.name === "string" ? frontmatter.name.trim() : "";
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

const findPersonEntry = (app: App, value: string): PersonEntry | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const entries = collectPersonEntries(app);
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
    cls: "mondo-settings-person-label",
  });
  if (item.path !== item.label) {
    el.createEl("div", {
      text: item.path,
      cls: "mondo-settings-person-path",
    });
  }
};

class PersonSuggest extends AbstractInputSuggest<PersonEntry> {
  private readonly getEntries: () => PersonEntry[];
  // Use a distinct name to avoid conflicting with AbstractInputSuggest.onSelect method signature
  private readonly handleSelect?: (entry: PersonEntry) => void | Promise<void>;

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

export const renderGeneralSection = (props: SettingsGeneralProps): void => {
  const { app, plugin, containerEl } = props;

  const generalSectionContainer = containerEl.createDiv();
  const generalSection = createSettingsSection(
    generalSectionContainer,
    "General",
    "General settings for the Mondo"
  );

  const storedSelfPath = (
    (plugin as any).settings?.selfPersonPath?.toString?.() ?? ""
  ).trim();

  const selfSetting = new Setting(generalSection.element)
    .setName("Who's me?")
    .setDesc('Pick a person that will be used to mean "myself" in the Mondo.');

  selfSetting.addSearch((search) => {
    const applyStoredValue = (value: string) => {
      try {
        search.setValue(value);
      } catch (error) {
        search.inputEl.value = value;
        search.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        search.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    const persistSelfPersonPath = async (path: string) => {
      const normalized = path.trim();
      if ((plugin as any).settings.selfPersonPath !== normalized) {
        (plugin as any).settings.selfPersonPath = normalized;
        await (plugin as any).saveSettings();
      }
    };

    const applyPersonSelection = async (entry: PersonEntry) => {
      if (search.inputEl.value !== entry.path) {
        applyStoredValue(entry.path);
      }
      await persistSelfPersonPath(entry.path);
    };

    const clearSelfPerson = async () => {
      if ((plugin as any).settings.selfPersonPath) {
        (plugin as any).settings.selfPersonPath = "";
        await (plugin as any).saveSettings();
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

        const entry = findPersonEntry(app, trimmed);
        if (!entry) {
          return;
        }

        await applyPersonSelection(entry);
      });

    const buttonEl = (search as any).buttonEl as HTMLButtonElement | undefined;
    if (buttonEl) {
      buttonEl.setAttribute("aria-label", "Select a person note");
      buttonEl.setAttribute("title", "Select a person note");
      buttonEl.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const modal = new PersonPickerModal(
          app,
          () => collectPersonEntries(app),
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
        app,
        search.inputEl as HTMLInputElement,
        () => collectPersonEntries(app),
        async (entry) => {
          await applyPersonSelection(entry);
        }
      );
      (props as any)._suggesters = (props as any)._suggesters || [];
      (props as any)._suggesters.push(suggest);
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
