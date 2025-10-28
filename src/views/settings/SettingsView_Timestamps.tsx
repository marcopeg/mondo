import { moment, Setting } from "obsidian";
import type CRM from "@/main";
import {
  DEFAULT_TIMESTAMP_SETTINGS,
  buildTimestampFromMoment,
  normalizeTimestampSettings,
  type TimestampSettings,
} from "@/types/TimestampSettings";
import type momentModule from "moment";

interface SettingsTimestampsProps {
  plugin: CRM;
  containerEl: HTMLElement;
}

const createSettingsSection = (
  parent: HTMLElement,
  heading: string,
  description?: string
) => {
  const createSetting = () => new Setting(parent);

  const headingSetting = createSetting();
  headingSetting.setName(heading);
  if (description) {
    headingSetting.setDesc(description);
  }
  headingSetting.setHeading();

  return {
    element: parent,
    createSetting,
  };
};

export const renderTimestampsSection = (
  props: SettingsTimestampsProps
): void => {
  const { plugin, containerEl } = props;

  const timestampSettingsSection = createSettingsSection(
    containerEl,
    "Timestamps",
    "Customize how the Add Timestamp command formats new entries."
  );

  const timestampPreviewDesc = document.createElement("div");
  const timestampPreviewCode = document.createElement("code");
  timestampPreviewCode.style.whiteSpace = "pre-wrap";
  timestampPreviewDesc.appendChild(document.createTextNode("Example output: "));
  timestampPreviewDesc.appendChild(timestampPreviewCode);

  const refreshTimestampPreview = () => {
    const current = normalizeTimestampSettings(
      (plugin as any).settings.timestamp
    );
    (plugin as any).settings.timestamp = current;
    const momentFactory = moment as unknown as typeof momentModule;
    const previewValue = buildTimestampFromMoment({
      moment: momentFactory(),
      settings: current,
      includeTrailingNewLine: true,
    });
    timestampPreviewCode.textContent = previewValue;
  };

  const applyTimestampSettings = async (
    partial: Partial<TimestampSettings>
  ) => {
    const current = normalizeTimestampSettings(
      (plugin as any).settings.timestamp
    );
    const merged = normalizeTimestampSettings({ ...current, ...partial });
    (plugin as any).settings.timestamp = merged;
    await (plugin as any).saveSettings();
    refreshTimestampPreview();
    return merged;
  };

  const currentTimestampSettings =
    ((plugin as any).settings.timestamp as TimestampSettings) ??
    DEFAULT_TIMESTAMP_SETTINGS;

  timestampSettingsSection
    .createSetting()
    .setName("Template")
    .setDesc(
      "Moment-style format string (e.g. YYYY/MM/DD hh:mm or [YY-MM-DD hh.mm])."
    )
    .addText((text) => {
      text
        .setPlaceholder(DEFAULT_TIMESTAMP_SETTINGS.template)
        .setValue(currentTimestampSettings.template)
        .onChange(async (value) => {
          const sanitized = await applyTimestampSettings({
            template: value,
          });
          if (sanitized.template !== value) {
            text.setValue(sanitized.template);
          }
        });
    });

  timestampSettingsSection
    .createSetting()
    .setName("Add newline after timestamp")
    .setDesc(
      "When enabled, an empty line is added immediately after the timestamp."
    )
    .addToggle((toggle) => {
      toggle
        .setValue(currentTimestampSettings.appendNewLine)
        .onChange(async (value) => {
          await applyTimestampSettings({ appendNewLine: value });
        });
    });

  const timestampPreviewSetting = timestampSettingsSection.createSetting();
  timestampPreviewSetting.setName("Preview");
  const timestampPreviewFragment = document.createDocumentFragment();
  timestampPreviewFragment.appendChild(timestampPreviewDesc);
  timestampPreviewSetting.setDesc(timestampPreviewFragment);

  refreshTimestampPreview();
};
