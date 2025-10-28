import { createSettingsSection } from "./SettingsView_utils";
import type CRM from "@/main";

interface SettingsDashboardProps {
  plugin: CRM;
  containerEl: HTMLElement;
}

const getDashboardSettings = (plugin: CRM) => {
  (plugin as any).settings = (plugin as any).settings ?? {};
  (plugin as any).settings.dashboard = (plugin as any).settings.dashboard ?? {};
  return (plugin as any).settings.dashboard as Record<string, unknown>;
};

const persistDashboardSetting = async (
  plugin: CRM,
  key: string,
  value: boolean
) => {
  const dashboardSettings = getDashboardSettings(plugin);
  dashboardSettings[key] = value;
  await (plugin as any).saveSettings();
};

export const renderDashboardSection = (
  props: SettingsDashboardProps
): void => {
  const { plugin, containerEl } = props;

  const dashboardSettings = getDashboardSettings(plugin);

  const dashboardSection = createSettingsSection(
    containerEl,
    "Dashboard",
    "Configure how the dashboard behaves and which panels are visible."
  );

  dashboardSection
    .createSetting()
    .setName("Open dashboard at boot")
    .setDesc("Automatically open the CRM dashboard when Obsidian starts.")
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
    .setName("Enable Stats")
    .setDesc("Show the dashboard statistics panel.")
    .addToggle((toggle) => {
      const current = dashboardSettings.enableStats !== false ? true : false;
      toggle.setValue(current).onChange(async (value) => {
        await persistDashboardSetting(plugin, "enableStats", value);
      });
    });
};
