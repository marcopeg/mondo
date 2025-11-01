import { AbstractInputSuggest, type App, setIcon } from "obsidian";
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
import {
  formatEntityTypeList,
  sanitizeEntityTypeList,
} from "@/utils/sanitizeEntityTypeList";

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
  search: string;
};

const parseEntityInput = (
  value: string,
  validTypes: readonly MondoEntityType[]
) => {
  const segments = value.split(",");
  const partialRaw = segments.pop() ?? "";
  const committed = sanitizeEntityTypeList(segments, validTypes);
  const partial = partialRaw.trim().toLowerCase();
  return { committed, partial };
};

class EntityTypeSuggest extends AbstractInputSuggest<EntityTypeOption> {
  private readonly options: EntityTypeOption[];
  private readonly validTypes: readonly MondoEntityType[];
  private readonly onPick: (type: MondoEntityType) => void;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    options: EntityTypeOption[],
    validTypes: readonly MondoEntityType[],
    onPick: (type: MondoEntityType) => void
  ) {
    super(app, inputEl);
    this.options = options;
    this.validTypes = validTypes;
    this.onPick = onPick;
  }

  getSuggestions(query: string): EntityTypeOption[] {
    const { committed, partial } = parseEntityInput(
      query ?? "",
      this.validTypes
    );
    const committedSet = new Set(committed);
    const normalizedPartial = partial ?? "";

    return this.options.filter((option) => {
      if (committedSet.has(option.type)) {
        return false;
      }

      if (!normalizedPartial) {
        return true;
      }

      return (
        option.type.includes(normalizedPartial) ||
        option.search.includes(normalizedPartial)
      );
    });
  }

  renderSuggestion(option: EntityTypeOption, el: HTMLElement) {
    el.setText(option.label);
  }

  selectSuggestion(option: EntityTypeOption) {
    try {
      this.onPick(option.type);
    } finally {
      try {
        this.close();
      } catch (error) {
        // ignore inability to close the suggest dropdown
      }
    }
  }
}

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
        search: `${name ?? ""} ${config.type}`.toLowerCase(),
      };
    });
  const quickSearchEntities = sanitizeEntityTypeList(
    dashboardSettings.quickSearchEntities,
    MONDO_ENTITY_TYPES
  );
  const quickSearchDisplayValue = formatEntityTypeList(quickSearchEntities);

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

  dashboardSection
    .createSetting()
    .setName("IMS Quick Search Entities")
    .setDesc(
      "Comma separated list of the entities that appear in the Quick Search list."
    )
    .addText((text) => {
      text
        .setPlaceholder("person, company")
        .setValue(quickSearchDisplayValue)
        .onChange(async (value) => {
          const sanitized = sanitizeEntityTypeList(
            value,
            MONDO_ENTITY_TYPES
          );
          dashboardSettings.quickSearchEntities = sanitized;
          await persistDashboardSetting(
            plugin,
            "quickSearchEntities",
            sanitized
          );
        });

      text.inputEl.addEventListener("blur", () => {
        const normalized = formatEntityTypeList(
          sanitizeEntityTypeList(text.getValue(), MONDO_ENTITY_TYPES)
        );
        text.setValue(normalized);
      });

      try {
        new EntityTypeSuggest(
          plugin.app,
          text.inputEl,
          availableEntityOptions,
          MONDO_ENTITY_TYPES,
          async (picked) => {
            const current = sanitizeEntityTypeList(
              text.getValue(),
              MONDO_ENTITY_TYPES
            );
            if (!current.includes(picked)) {
              current.push(picked);
            }
            const nextDisplay = formatEntityTypeList(current);
            text.setValue(nextDisplay ? `${nextDisplay}, ` : "");
            dashboardSettings.quickSearchEntities = current;
            await persistDashboardSetting(
              plugin,
              "quickSearchEntities",
              current
            );
          }
        );
      } catch (error) {
        console.error(
          "Mondo dashboard settings: failed to initialize entity suggest",
          error
        );
      }
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
