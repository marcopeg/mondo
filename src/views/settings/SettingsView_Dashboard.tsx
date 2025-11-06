import { Menu, Setting, setIcon } from "obsidian";
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

export const DEFAULT_RELEVANT_NOTES_HISTORY_DAYS = 20;

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
  const nextDashboard = {
    ...dashboardSettings,
    [key]: value,
  } as Record<string, unknown>;

  (plugin as any).settings.dashboard = nextDashboard;
  Object.assign(dashboardSettings, nextDashboard);

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
  // Do NOT filter by MONDO_ENTITY_TYPES here to ensure values prefill even if
  // the entity config hasn't been applied yet at render time.
  const quickTasksEntities = sanitizeEntityTypeList(
    dashboardSettings.quickTasksEntities
  );
  const entityTiles = sanitizeEntityTypeList(
    dashboardSettings.entityTiles,
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
    .setName("Enable Quick Daily")
    .setDesc("Show the Quick Daily list on the dashboard.")
    .addToggle((toggle) => {
      const current = dashboardSettings.enableQuickDaily === true ? true : false;
      toggle.setValue(current).onChange(async (value) => {
        await persistDashboardSetting(plugin, "enableQuickDaily", value);
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
    .setName("Relevant Notes History Days")
    .setDesc(
      `Number of days to look back for relevant notes history (default: ${DEFAULT_RELEVANT_NOTES_HISTORY_DAYS}).`
    )
    .addText((text) => {
      const current =
        dashboardSettings.relevantNotesHistoryDays ??
        DEFAULT_RELEVANT_NOTES_HISTORY_DAYS;
      text
        .setPlaceholder(String(DEFAULT_RELEVANT_NOTES_HISTORY_DAYS))
        .setValue(String(current))
        .onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            await persistDashboardSetting(plugin, "relevantNotesHistoryDays", parsed);
          }
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

  const renderEntityListControl = (options: {
    setting: Setting;
    initialState: MondoEntityType[];
    persist: (next: MondoEntityType[]) => Promise<void>;
    addButtonAriaLabel: string;
    removeButtonAriaLabel: (type: MondoEntityType) => string;
  }) => {
    const { setting, initialState, persist, addButtonAriaLabel, removeButtonAriaLabel } =
      options;

    setting.settingEl.addClass("mondo-settings-entity-list-setting");

    const controlEl = setting.controlEl;
    controlEl.empty();

    const tagsEl = controlEl.createDiv({
      cls: "mondo-settings-entity-tags",
    });

    const addButtonEl = tagsEl.createEl("button", {
      cls: "mondo-settings-entity-tags__add-button",
      text: "Add Entity",
      attr: {
        type: "button",
        "aria-label": addButtonAriaLabel,
        "aria-haspopup": "menu",
      },
    }) as HTMLButtonElement;

    let state = [...initialState];

    const persistState = async (next: MondoEntityType[]) => {
      state = next;
      await persist(next);
    };

    const getRemainingOptions = () =>
      availableEntityOptions.filter((option) => !state.includes(option.type));

    const updateAddButtonState = () => {
      const hasRemaining = getRemainingOptions().length > 0;
      addButtonEl.disabled = !hasRemaining;
      addButtonEl.setAttr("aria-disabled", hasRemaining ? "false" : "true");
    };

    const renderTags = () => {
      const existing = tagsEl.querySelectorAll<HTMLElement>(
        ".mondo-settings-entity-tags__chip"
      );
      existing.forEach((element) => {
        element.remove();
      });

      state.forEach((type, index) => {
        const chipEl = tagsEl.createSpan({
          cls: "mondo-settings-entity-tags__chip",
          attr: {
            draggable: "true",
            "data-index": `${index}`,
            role: "listitem",
          },
        });

        const labelEl = chipEl.createSpan({
          cls: "mondo-settings-entity-tags__chip-label",
        });
        labelEl.setText(type);

        const removeButton = chipEl.createSpan({
          cls: "mondo-settings-entity-tags__chip-remove",
          attr: {
            role: "button",
            tabindex: "0",
            "aria-label": removeButtonAriaLabel(type),
          },
        });
        setIcon(removeButton, "x");

        const removeAtIndex = async () => {
          const next = state.filter((_, i) => i !== index);
          await persistState(next);
          renderTags();
          addButtonEl.focus();
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
          const next = [...state];
          const [moved] = next.splice(fromIndex, 1);
          if (!moved) {
            return;
          }
          if (toIndex >= next.length) {
            next.push(moved);
          } else {
            next.splice(Math.max(toIndex, 0), 0, moved);
          }
          void persistState(next).then(() => {
            renderTags();
          });
        });

        tagsEl.insertBefore(chipEl, addButtonEl);
      });

      tagsEl.classList.toggle("is-empty", state.length === 0);
      updateAddButtonState();
    };

    tagsEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      const dataTransfer = event.dataTransfer;
      if (dataTransfer) {
        dataTransfer.dropEffect = "move";
      }
    });

    tagsEl.addEventListener("drop", (event) => {
      event.preventDefault();
      if ((event.target as HTMLElement).closest(".mondo-settings-entity-tags__chip")) {
        return;
      }
      const fromIndexRaw = event.dataTransfer?.getData("text/plain");
      const fromIndex = Number.parseInt(fromIndexRaw ?? "", 10);
      if (Number.isNaN(fromIndex)) {
        return;
      }
      const next = [...state];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return;
      }
      next.push(moved);
      void persistState(next).then(() => {
        renderTags();
      });
    });

    const openMenu = (event: MouseEvent | KeyboardEvent) => {
      event.preventDefault();
      if (addButtonEl.disabled) {
        return;
      }

      const remainingOptions = getRemainingOptions().sort((a, b) =>
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
            const next = [...state, option.type];
            void persistState(next).then(() => {
              renderTags();
              addButtonEl.focus();
            });
          });
        });
      });

      if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
        menu.showAtMouseEvent(event);
      } else {
        const rect = addButtonEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom });
      }
    };

    addButtonEl.addEventListener("click", (event) => {
      openMenu(event);
    });

    renderTags();
  };

  const quickTasksSetting = dashboardSection
    .createSetting()
    .setName("IMS Quick Tasks Entities")
    .setDesc("Choose which entities appear in the Convert Type menu.");

  const persistQuickTasksState = async (next: MondoEntityType[]) => {
    await persistDashboardSetting(plugin, "quickTasksEntities", next);
  };

  renderEntityListControl({
    setting: quickTasksSetting,
    initialState: quickTasksEntities,
    persist: persistQuickTasksState,
    addButtonAriaLabel: "Add quick tasks entity",
    removeButtonAriaLabel: (type) => `Remove ${type} from quick tasks`,
  });

  const quickSearchSetting = dashboardSection
    .createSetting()
    .setName("IMS Quick Search Entities")
    .setDesc("Choose which entities appear in the Quick Search list.");

  const persistQuickSearchState = async (next: MondoEntityType[]) => {
    await persistDashboardSetting(plugin, "quickSearchEntities", next);
  };

  renderEntityListControl({
    setting: quickSearchSetting,
    initialState: quickSearchEntities,
    persist: persistQuickSearchState,
    addButtonAriaLabel: "Add quick search entity",
    removeButtonAriaLabel: (type) => `Remove ${type} from quick search`,
  });

  const entityTilesSetting = dashboardSection
    .createSetting()
    .setName("IMS Entities")
    .setDesc("Choose which entities appear in the IMS Entities grid.");

  const persistEntityTilesState = async (next: MondoEntityType[]) => {
    await persistDashboardSetting(plugin, "entityTiles", next);
  };

  renderEntityListControl({
    setting: entityTilesSetting,
    initialState: entityTiles,
    persist: persistEntityTilesState,
    addButtonAriaLabel: "Add IMS entity",
    removeButtonAriaLabel: (type) => `Remove ${type} from IMS Entities`,
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
