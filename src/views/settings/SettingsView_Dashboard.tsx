import { setIcon } from "obsidian";
import { createSettingsSection } from "./SettingsView_utils";
import type Mondo from "@/main";
import { DASHBOARD_ICON } from "@/views/dashboard-view/wrapper";
import { AUDIO_LOGS_ICON } from "@/views/audio-logs-view/constants";
import { VAULT_IMAGES_ICON } from "@/views/vault-images-view/constants";
import { VAULT_FILES_ICON } from "@/views/vault-files-view/constants";
import { VAULT_NOTES_ICON } from "@/views/vault-notes-view/constants";

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
  value: boolean
) => {
  const dashboardSettings = getDashboardSettings(plugin);
  dashboardSettings[key] = value;
  await (plugin as any).saveSettings();
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
