import type Mondo from "@/main";
import {
  getAiApiKey,
  setAiApiKey,
  detectAiProviderFromKey,
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
    .setName("AI API Key")
    .setDesc("Your API key (sk-... for OpenAI, AIza... for Google Gemini). The provider will be detected automatically.");

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
      placeholder: "sk-... or AIza...",
      value: getAiApiKey(plugin.settings),
    },
    cls: "mondo-ai-provider-setting__input",
  });

  const detectionEl = keyFieldEl.createDiv({
    cls: "mondo-ai-provider-setting__detection",
  });

  const updateDetection = () => {
    const key = keyInputEl.value.trim();
    const detected = detectAiProviderFromKey(key);
    
    detectionEl.empty();
    
    if (!key) {
      detectionEl.createEl("span", {
        text: "No API key provided",
        cls: "mondo-ai-provider-setting__detection-text mondo-ai-provider-setting__detection-unknown",
      });
    } else if (detected === "openai") {
      detectionEl.createEl("span", {
        text: "✓ Detected: OpenAI",
        cls: "mondo-ai-provider-setting__detection-text mondo-ai-provider-setting__detection-success",
      });
    } else if (detected === "gemini") {
      detectionEl.createEl("span", {
        text: "✓ Detected: Google Gemini",
        cls: "mondo-ai-provider-setting__detection-text mondo-ai-provider-setting__detection-success",
      });
    } else {
      detectionEl.createEl("span", {
        text: "⚠ Unknown provider",
        cls: "mondo-ai-provider-setting__detection-text mondo-ai-provider-setting__detection-unknown",
      });
    }
  };

  keyInputEl.addEventListener("change", async (event) => {
    const target = event.currentTarget as HTMLInputElement;
    const trimmed = target.value.trim();
    target.value = trimmed;
    setAiApiKey(plugin.settings, trimmed);
    await plugin.saveSettings();
    updateDetection();
  });

  keyInputEl.addEventListener("input", updateDetection);

  // Initial detection display
  updateDetection();

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
