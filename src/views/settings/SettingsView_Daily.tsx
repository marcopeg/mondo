import { Setting } from "obsidian";
import type CRM from "@/main";
import { createSettingsSection } from "./SettingsView_utils";

interface SettingsDailyProps {
  plugin: CRM;
  containerEl: HTMLElement;
  addFolderSetting: (
    container: HTMLElement | (() => Setting),
    name: string,
    desc: string,
    getValue: () => string,
    setValue: (v: string) => Promise<void>
  ) => Setting;
}

export const renderDailySection = (props: SettingsDailyProps): void => {
  const { plugin, containerEl, addFolderSetting } = props;

  const dailySettingsSection = createSettingsSection(
    containerEl,
    "Daily Logs",
    "Settings for Daily Logs"
  );

  addFolderSetting(
    dailySettingsSection.createSetting,
    "Daily root",
    "Where do you want to store your Daily Logs?\n(Default: Daily)",
    () => (plugin as any).settings.daily?.root ?? "Daily",
    async (v) => {
      (plugin as any).settings.daily = (plugin as any).settings.daily || {};
      (plugin as any).settings.daily.root = v || "Daily";
      await (plugin as any).saveSettings();
    }
  );

  dailySettingsSection
    .createSetting()
    .setName("Entry format")
    .setDesc("Filename format for daily entries (default: YYYY-MM-DD)")
    .addText((t) => {
      t.setPlaceholder("YYYY-MM-DD")
        .setValue((plugin as any).settings.daily?.entry ?? "YYYY-MM-DD")
        .onChange(async (v) => {
          (plugin as any).settings.daily = (plugin as any).settings.daily || {};
          (plugin as any).settings.daily.entry = v || "YYYY-MM-DD";
          await (plugin as any).saveSettings();
        });
      try {
        (t.inputEl as HTMLInputElement).style.textAlign = "right";
      } catch (e) {}
    });

  dailySettingsSection
    .createSetting()
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
      const current = (plugin as any).settings.daily?.section ?? "h2";
      d.addOptions(opts)
        .setValue(current)
        .onChange(async (v) => {
          (plugin as any).settings.daily = (plugin as any).settings.daily || {};
          (plugin as any).settings.daily.section = v;
          await (plugin as any).saveSettings();
        });
    });

  dailySettingsSection
    .createSetting()
    .setName("Section Title")
    .setDesc("Time format for notes inside daily logs (default: HH:MM)")
    .addText((t) => {
      t.setPlaceholder("HH:MM")
        .setValue((plugin as any).settings.daily?.note ?? "HH:MM")
        .onChange(async (v) => {
          (plugin as any).settings.daily = (plugin as any).settings.daily || {};
          (plugin as any).settings.daily.note = v || "HH:MM";
          await (plugin as any).saveSettings();
        });
      try {
        (t.inputEl as HTMLInputElement).style.textAlign = "right";
      } catch (e) {}
    });

  // Toggle for inserting bullets in daily logs
  const dailyUseBullets = (plugin as any).settings.daily?.useBullets;
  dailySettingsSection
    .createSetting()
    .setName("Use bullets for entries")
    .setDesc(
      "If enabled, new daily entries will be prefixed with a bullet ('- ')."
    )
    .addToggle((t) => {
      t.setValue(dailyUseBullets ?? true).onChange(async (v) => {
        (plugin as any).settings.daily = (plugin as any).settings.daily || {};
        (plugin as any).settings.daily.useBullets = v;
        await (plugin as any).saveSettings();
      });
    });
};
