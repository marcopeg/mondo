import { Setting } from "obsidian";
import type Mondo from "@/main";
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
