import { Setting } from "obsidian";
import type CRM from "@/main";
import { createSettingsSection } from "./SettingsView_utils";

interface SettingsJournalProps {
  plugin: CRM;
  containerEl: HTMLElement;
  addFolderSetting: (
    container: HTMLElement | (() => Setting),
    name: string,
    desc: string,
    getValue: () => string,
    setValue: (v: string) => Promise<void>
  ) => Setting;
  onDisplayUpdate: () => Promise<void>;
}

export const renderJournalSection = (props: SettingsJournalProps): void => {
  const { plugin, containerEl, addFolderSetting, onDisplayUpdate } = props;

  const journalSettingsSection = createSettingsSection(
    containerEl,
    "Journal",
    "Settings for the Journal feature"
  );

  addFolderSetting(
    journalSettingsSection.createSetting,
    "Journal root",
    "Where do you want to store your Journaling notes?\n(Default: Journal)",
    () => (plugin as any).settings.journal?.root ?? "Journal",
    async (v) => {
      (plugin as any).settings.journal = (plugin as any).settings.journal || {};
      (plugin as any).settings.journal.root = v || "Journal";
      await (plugin as any).saveSettings();
    }
  );

  journalSettingsSection
    .createSetting()
    .setName("Entry format")
    .setDesc("Filename format for journal entries (default: YYYY-MM-DD)")
    .addText((t) => {
      t.setPlaceholder("YYYY-MM-DD")
        .setValue((plugin as any).settings.journal?.entry ?? "YYYY-MM-DD")
        .onChange(async (v) => {
          (plugin as any).settings.journal =
            (plugin as any).settings.journal || {};
          (plugin as any).settings.journal.entry = v || "YYYY-MM-DD";
          await (plugin as any).saveSettings();
        });
      try {
        (t.inputEl as HTMLInputElement).style.textAlign = "right";
      } catch (e) {}
    });

  // Journal sections toggle + conditional settings
  const journalUseSections =
    (plugin as any).settings.journal?.useSections ?? false;

  journalSettingsSection
    .createSetting()
    .setName("Enable Sections")
    .setDesc("Organize your journal by time entries")
    .addToggle((t) => {
      t.setValue(journalUseSections).onChange(async (v) => {
        (plugin as any).settings.journal =
          (plugin as any).settings.journal || {};
        (plugin as any).settings.journal.useSections = v;
        await (plugin as any).saveSettings();
        // Re-render settings so conditional fields appear/disappear
        await onDisplayUpdate();
      });
    });

  if (journalUseSections) {
    journalSettingsSection
      .createSetting()
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
        const current = (plugin as any).settings.journal?.section ?? "h3";
        d.addOptions(opts)
          .setValue(current)
          .onChange(async (v) => {
            (plugin as any).settings.journal =
              (plugin as any).settings.journal || {};
            (plugin as any).settings.journal.section = v;
            await (plugin as any).saveSettings();
          });
      });

    journalSettingsSection
      .createSetting()
      .setName("Section Title")
      .setDesc("Time format for notes inside journal entries (default: HH:MM)")
      .addText((t) => {
        t.setPlaceholder("HH:MM")
          .setValue((plugin as any).settings.journal?.note ?? "HH:MM")
          .onChange(async (v) => {
            (plugin as any).settings.journal =
              (plugin as any).settings.journal || {};
            (plugin as any).settings.journal.note = v || "HH:MM";
            await (plugin as any).saveSettings();
          });
        try {
          (t.inputEl as HTMLInputElement).style.textAlign = "right";
        } catch (e) {}
      });
  }
};
