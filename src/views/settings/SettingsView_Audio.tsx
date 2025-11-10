import type Mondo from "@/main";
import {
  getAiApiKey,
  getAiProviderOptions,
  getSelectedAiProviderId,
  setAiApiKey,
} from "@/ai/settings";
import { createSettingsSection } from "./SettingsView_utils";

interface SettingsAudioProps {
  plugin: Mondo;
  containerEl: HTMLElement;
}

export const renderAudioSection = (props: SettingsAudioProps): void => {
  const { plugin, containerEl } = props;

  const audioSettingsSection = createSettingsSection(
    containerEl,
    "Audio Transcription",
    "Configure AI transcription for embedded audio."
  );

  const providerSetting = audioSettingsSection
    .createSetting()
    .setName("AI Provider")
    .setDesc("Configure the AI provider and API key used for audio features.");

  providerSetting.controlEl.addClass("mondo-ai-provider-setting");

  const controlsEl = providerSetting.controlEl.createDiv({
    cls: "mondo-ai-provider-setting__controls",
  });

  const keyFieldEl = controlsEl.createDiv({
    cls: "mondo-ai-provider-setting__field",
  });
  keyFieldEl.createEl("label", {
    text: "API Key",
    cls: "mondo-ai-provider-setting__label",
  });

  const keyInputEl = keyFieldEl.createEl("input", {
    attr: {
      type: "password",
      placeholder: "sk-...",
      value: getAiApiKey(plugin.settings),
    },
    cls: "mondo-ai-provider-setting__input",
  });

  keyInputEl.addEventListener("change", async (event) => {
    const target = event.currentTarget as HTMLInputElement;
    const trimmed = target.value.trim();
    target.value = trimmed;
    setAiApiKey(plugin.settings, trimmed);
    await plugin.saveSettings();
  });

  const providerFieldEl = controlsEl.createDiv({
    cls: "mondo-ai-provider-setting__field",
  });
  providerFieldEl.createEl("label", {
    text: "Provider",
    cls: "mondo-ai-provider-setting__label",
  });

  const providerSelectEl = providerFieldEl.createEl("select", {
    cls: "mondo-ai-provider-setting__input",
  });

  const providerOptions = getAiProviderOptions();
  const selectedProvider = getSelectedAiProviderId(plugin.settings);

  for (const option of providerOptions) {
    providerSelectEl.createEl("option", {
      value: option.id,
      text: option.label,
    });
  }

  providerSelectEl.value = selectedProvider;

  providerSelectEl.addEventListener("change", async (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    (plugin.settings as { aiProvider?: string }).aiProvider = target.value;
    await plugin.saveSettings();
  });

  audioSettingsSection
    .createSetting()
    .setName("Show recording button")
    .setDesc(
      "Show the floating record button on desktop notes when transcription is enabled."
    )
    .addToggle((toggle) => {
      const settings = (plugin as any).settings.voiceDictation ?? {};
      toggle
        .setValue(settings.showRecordingButton === true)
        .onChange(async (value) => {
          (plugin as any).settings.voiceDictation = {
            ...(plugin as any).settings.voiceDictation,
            showRecordingButton: value,
          };
          await (plugin as any).saveSettings();
          plugin.getNoteDictationManager()?.refresh();
        });
    });
};
