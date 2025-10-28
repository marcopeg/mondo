import { Setting } from "obsidian";
import type CRM from "@/main";

interface SettingsAudioProps {
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

export const renderAudioSection = (props: SettingsAudioProps): void => {
  const { plugin, containerEl } = props;

  const audioSettingsSection = createSettingsSection(
    containerEl,
    "Audio Transcription",
    "Configure AI transcription for embedded audio."
  );

  audioSettingsSection
    .createSetting()
    .setName("OpenAI Whisper API key")
    .setDesc(
      "Used to transcribe embedded audio with OpenAI Whisper-compatible models."
    )
    .addText((text) => {
      text
        .setPlaceholder("sk-...")
        .setValue(
          (plugin as any).settings.openAIWhisperApiKey?.toString?.() ?? ""
        )
        .onChange(async (value) => {
          (plugin as any).settings.openAIWhisperApiKey = value.trim();
          await (plugin as any).saveSettings();
        });

      try {
        (text.inputEl as HTMLInputElement).type = "password";
      } catch (e) {}
    });
};
