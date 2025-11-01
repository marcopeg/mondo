import { Menu, setIcon } from "obsidian";
import { createSettingsSection } from "./SettingsView_utils";
import type Mondo from "@/main";
import { DASHBOARD_ICON } from "@/views/dashboard-view/wrapper";
import { AUDIO_LOGS_ICON } from "@/views/audio-logs-view/constants";
import { VAULT_IMAGES_ICON } from "@/views/vault-images-view/constants";
import { VAULT_FILES_ICON } from "@/views/vault-files-view/constants";
import { VAULT_NOTES_ICON } from "@/views/vault-notes-view/constants";
import {
  MONDO_ENTITY_CONFIG_LIST,
  MONDO_ENTITY_TYPES,
} from "@/entities";
import type { MondoEntityType } from "@/types/MondoEntityTypes";
import { sanitizeEntityTypeList } from "@/utils/sanitizeEntityTypeList";

interface SettingsDashboardProps {
  plugin: Mondo;
  containerEl: HTMLElement;
}

const getDashboardSettings = (plugin: Mondo) => {
  (plugin as any).settings = (plugin as any).settings ?? {};
  (plugin as any).settings.dashboard = (plugin as any).settings.dashboard ?? {};
  return (plugin as any).settings.dashboard as Record<string, unknown>;
};

const persistDashboardSetting = async (
  plugin: Mondo,
  key: string,
  value: unknown
) => {
  const dashboardSettings = getDashboardSettings(plugin);
  dashboardSettings[key] = value;
  await (plugin as any).saveSettings();
  try {
    window.dispatchEvent(new CustomEvent("mondo:settings-updated"));
  } catch (_) {
    // ignore environments where window is unavailable
  }
};

type EntityTypeOption = {
  type: MondoEntityType;
  label: string;
};

const getRibbonSettings = (plugin: Mondo) => {
  (plugin as any).settings = (plugin as any).settings ?? {};
  (plugin as any).settings.ribbonIcons =
    (plugin as any).settings.ribbonIcons ?? {};
  return (plugin as any).settings.ribbonIcons as Record<string, unknown>;
};

const persistRibbonSetting = async (
  plugin: Mondo,
  key: string,
  value: boolean
) => {
  const ribbonSettings = getRibbonSettings(plugin);
  if ((ribbonSettings[key] as boolean | undefined) === value) {
    plugin.refreshRibbonIcons();
    return;
  }

  ribbonSettings[key] = value;
  await (plugin as any).saveSettings();
  plugin.refreshRibbonIcons();
};

export const renderDashboardSection = (
  props: SettingsDashboardProps
): void => {
  const { plugin, containerEl } = props;

  const dashboardSettings = getDashboardSettings(plugin);
  const ribbonSettings = getRibbonSettings(plugin);
  const availableEntityOptions: EntityTypeOption[] =
    MONDO_ENTITY_CONFIG_LIST.map((config) => {
      const name = typeof config.name === "string" ? config.name : config.type;
      return {
        type: config.type,
        label: `${name} (${config.type})`,
      };
    });
  const quickSearchEntities = sanitizeEntityTypeList(
    dashboardSettings.quickSearchEntities,
    MONDO_ENTITY_TYPES
  );
  const dashboardSection = createSettingsSection(
    containerEl,
    "Dashboard",
    "Configure how the dashboard behaves and which panels are visible."
  );

  dashboardSection
    .createSetting()
    .setName("Open dashboard at boot")
    .setDesc("Automatically open the Mondo dashboard when Obsidian starts.")
    .addToggle((toggle) => {
      toggle
        .setValue(Boolean(dashboardSettings.openAtBoot))
        .onChange(async (value) => {
          await persistDashboardSetting(plugin, "openAtBoot", value);
        });
    });

  dashboardSection
    .createSetting()
    .setName("Force dashboard tab")
    .setDesc(
      "Reopen the dashboard automatically when all other tabs are closed."
    )
    .addToggle((toggle) => {
      toggle
        .setValue(Boolean(dashboardSettings.forceTab))
        .onChange(async (value) => {
          await persistDashboardSetting(plugin, "forceTab", value);
        });
    });

  dashboardSection
    .createSetting()
    .setName("Enable Quick Tasks")
    .setDesc("Show the Quick Tasks list on the dashboard.")
    .addToggle((toggle) => {
      const current =
        dashboardSettings.enableQuickTasks !== false ? true : false;
      toggle.setValue(current).onChange(async (value) => {
        await persistDashboardSetting(plugin, "enableQuickTasks", value);
      });
    });

  dashboardSection
    .createSetting()
    .setName("Enable Relevant Notes")
    .setDesc("Show Relevant Notes on the dashboard.")
    .addToggle((toggle) => {
      const current =
        dashboardSettings.enableRelevantNotes !== false ? true : false;
      toggle.setValue(current).onChange(async (value) => {
        await persistDashboardSetting(plugin, "enableRelevantNotes", value);
      });
    });

  dashboardSection
    .createSetting()
    .setName("Disable Stats Block")
    .setDesc("Hide the stats block on the dashboard.")
    .addToggle((toggle) => {
      const current = dashboardSettings.disableStats === false ? false : true;
      toggle.setValue(current).onChange(async (value) => {
        await persistDashboardSetting(plugin, "disableStats", value);
      });
    });

  const quickSearchSetting = dashboardSection
    .createSetting()
    .setName("IMS Quick Search Entities")
    .setDesc("Choose which entities appear in the Quick Search list.");

  quickSearchSetting.settingEl.addClass(
    "mondo-settings-quick-search-entities"
  );

  const quickSearchControlEl = quickSearchSetting.controlEl;
  quickSearchControlEl.empty();

  const quickSearchTagsEl = quickSearchControlEl.createDiv({
    cls: "mondo-settings-quick-search-tags",
  });

  const quickSearchAddButtonEl = quickSearchTagsEl.createEl("button", {
    cls: "mondo-settings-quick-search-tags__add-button",
    text: "Add Entity",
    attr: {
      type: "button",
      "aria-label": "Add quick search entity",
      "aria-haspopup": "menu",
    },
  }) as HTMLButtonElement;

  let quickSearchEntitiesState = [...quickSearchEntities];

  const persistQuickSearchState = async (next: MondoEntityType[]) => {
    quickSearchEntitiesState = next;
    dashboardSettings.quickSearchEntities = next;
    await persistDashboardSetting(plugin, "quickSearchEntities", next);
  };

  const getRemainingEntityOptions = () =>
    availableEntityOptions.filter(
      (option) => !quickSearchEntitiesState.includes(option.type)
    );

  const updateAddButtonState = () => {
    const hasRemaining = getRemainingEntityOptions().length > 0;
    quickSearchAddButtonEl.disabled = !hasRemaining;
    quickSearchAddButtonEl.setAttr("aria-disabled", hasRemaining ? "false" : "true");
  };

  const renderQuickSearchTags = () => {
    const existing = quickSearchTagsEl.querySelectorAll<HTMLElement>(
      ".mondo-settings-quick-search-tags__chip"
    );
    existing.forEach((element) => {
      element.remove();
    });

    quickSearchEntitiesState.forEach((type, index) => {
      const chipEl = quickSearchTagsEl.createSpan({
        cls: "mondo-settings-quick-search-tags__chip",
        attr: {
          draggable: "true",
          "data-index": `${index}`,
          role: "listitem",
        },
      });

      const labelEl = chipEl.createSpan({
        cls: "mondo-settings-quick-search-tags__chip-label",
      });
      labelEl.setText(type);

      const removeButton = chipEl.createSpan({
        cls: "mondo-settings-quick-search-tags__chip-remove",
        attr: {
          role: "button",
          tabindex: "0",
          "aria-label": `Remove ${type} from quick search`,
        },
      });
      setIcon(removeButton, "x");

      const removeAtIndex = async () => {
        const next = quickSearchEntitiesState.filter((_, i) => i !== index);
        await persistQuickSearchState(next);
        renderQuickSearchTags();
        quickSearchAddButtonEl.focus();
      };

      removeButton.addEventListener("click", () => {
        void removeAtIndex();
      });

      removeButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void removeAtIndex();
        }
      });

      chipEl.addEventListener("dragstart", (event) => {
        const dataTransfer = event.dataTransfer;
        if (dataTransfer) {
          dataTransfer.setData("text/plain", `${index}`);
          dataTransfer.effectAllowed = "move";
        }
        chipEl.classList.add("is-dragging");
      });

      chipEl.addEventListener("dragend", () => {
        chipEl.classList.remove("is-dragging");
        chipEl.classList.remove("is-dragover");
      });

      chipEl.addEventListener("dragover", (event) => {
        event.preventDefault();
        chipEl.classList.add("is-dragover");
        const dataTransfer = event.dataTransfer;
        if (dataTransfer) {
          dataTransfer.dropEffect = "move";
        }
      });

      chipEl.addEventListener("dragleave", () => {
        chipEl.classList.remove("is-dragover");
      });

      chipEl.addEventListener("drop", (event) => {
        event.preventDefault();
        chipEl.classList.remove("is-dragover");
        const fromIndexRaw = event.dataTransfer?.getData("text/plain");
        const fromIndex = Number.parseInt(fromIndexRaw ?? "", 10);
        if (Number.isNaN(fromIndex)) {
          return;
        }
        const toIndex = Number.parseInt(chipEl.dataset.index ?? "", 10);
        if (Number.isNaN(toIndex)) {
          return;
        }
        if (fromIndex === toIndex) {
          return;
        }
        const next = [...quickSearchEntitiesState];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) {
          return;
        }
        if (toIndex >= next.length) {
          next.push(moved);
        } else {
          next.splice(Math.max(toIndex, 0), 0, moved);
        }
        void persistQuickSearchState(next).then(() => {
          renderQuickSearchTags();
        });
      });

      quickSearchTagsEl.insertBefore(chipEl, quickSearchAddButtonEl);
    });

    quickSearchTagsEl.classList.toggle(
      "is-empty",
      quickSearchEntitiesState.length === 0
    );
    updateAddButtonState();
  };

  quickSearchTagsEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.dropEffect = "move";
    }
  });

  quickSearchTagsEl.addEventListener("drop", (event) => {
    event.preventDefault();
    if ((event.target as HTMLElement).closest(
      ".mondo-settings-quick-search-tags__chip"
    )) {
      return;
    }
    const fromIndexRaw = event.dataTransfer?.getData("text/plain");
    const fromIndex = Number.parseInt(fromIndexRaw ?? "", 10);
    if (Number.isNaN(fromIndex)) {
      return;
    }
    const next = [...quickSearchEntitiesState];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) {
      return;
    }
    next.push(moved);
    void persistQuickSearchState(next).then(() => {
      renderQuickSearchTags();
    });
  });

  renderQuickSearchTags();

  const openQuickSearchMenu = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    if (quickSearchAddButtonEl.disabled) {
      return;
    }

    const remainingOptions = getRemainingEntityOptions().sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

    if (remainingOptions.length === 0) {
      updateAddButtonState();
      return;
    }

    const menu = new Menu();
    remainingOptions.forEach((option) => {
      menu.addItem((item) => {
        item.setTitle(option.label).onClick(() => {
          const next = [...quickSearchEntitiesState, option.type];
          void persistQuickSearchState(next).then(() => {
            renderQuickSearchTags();
            quickSearchAddButtonEl.focus();
          });
        });
      });
    });

    if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
      menu.showAtMouseEvent(event);
    } else {
      const rect = quickSearchAddButtonEl.getBoundingClientRect();
      menu.showAtPosition({ x: rect.left, y: rect.bottom });
    }
  };

  quickSearchAddButtonEl.addEventListener("click", (event) => {
    openQuickSearchMenu(event);
  });

  dashboardSection
    .createSetting()
    .setName("Ribbon Shortcuts")
    .setDesc("Choose which stats shortcuts appear in the left ribbon.")
    .setHeading();

  const addRibbonToggle = (options: {
    key: string;
    name: string;
    description: string;
    icon: string;
  }) => {
    const currentValue = ribbonSettings[options.key] !== false;
    const setting = dashboardSection
      .createSetting()
      .setName(options.name)
      .setDesc(options.description);

    const iconWrapper = setting.controlEl.createSpan({
      cls: "mondo-settings-ribbon-toggle-icon",
      attr: { "aria-hidden": "true" },
    });
    const iconEl = iconWrapper.createSpan();
    setIcon(iconEl, options.icon);

    setting.addToggle((toggle) => {
      toggle.setValue(currentValue).onChange(async (value) => {
        ribbonSettings[options.key] = value;
        await persistRibbonSetting(plugin, options.key, value);
      });
    });
  };

  addRibbonToggle({
    key: "dashboard",
    name: "Show Dashboard Ribbon Icon",
    description: "Toggle the dashboard shortcut in Obsidian's left ribbon.",
    icon: DASHBOARD_ICON,
  });

  addRibbonToggle({
    key: "audioLogs",
    name: "Show Audio Notes Ribbon Icon",
    description: "Toggle the audio notes shortcut in Obsidian's left ribbon.",
    icon: AUDIO_LOGS_ICON,
  });

  addRibbonToggle({
    key: "vaultImages",
    name: "Show Images Ribbon Icon",
    description:
      "Toggle the images stats shortcut in Obsidian's left ribbon.",
    icon: VAULT_IMAGES_ICON,
  });

  addRibbonToggle({
    key: "vaultFiles",
    name: "Show Files Ribbon Icon",
    description: "Toggle the files stats shortcut in Obsidian's left ribbon.",
    icon: VAULT_FILES_ICON,
  });

  addRibbonToggle({
    key: "vaultNotes",
    name: "Show Notes Ribbon Icon",
    description: "Toggle the notes stats shortcut in Obsidian's left ribbon.",
    icon: VAULT_NOTES_ICON,
  });
};
