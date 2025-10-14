import type CRM from "@/main";
import {
  MarkdownPostProcessorContext,
  Notice,
  TFile,
  setIcon,
} from "obsidian";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

const MIME_FALLBACK = "application/octet-stream";
const EXTENSION_TO_MIME: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_MIME));

type Maybe<T> = T | null | undefined;

const getMimeFromExtension = (extension: Maybe<string>) => {
  if (!extension) {
    return MIME_FALLBACK;
  }

  const normalized = extension.replace(/^\./, "").toLowerCase();
  return EXTENSION_TO_MIME[normalized] ?? MIME_FALLBACK;
};

export class AudioTranscriptionManager {
  private readonly plugin: CRM;

  private readonly activeTranscriptions = new Set<string>();

  private readonly renderedEmbeds = new WeakMap<HTMLElement, string>();

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    // Placeholder for future initialization logic.
  };

  dispose = () => {
    this.activeTranscriptions.clear();
  };

  isAudioFile = (file: Maybe<TFile>) => {
    if (!file) {
      return false;
    }

    return SUPPORTED_EXTENSIONS.has(file.extension.toLowerCase());
  };

  transcribeAudioFile = async (
    file: TFile,
    originPath?: string
  ): Promise<TFile | null> => {
    const apiKey = this.plugin.settings?.openAIWhisperApiKey?.trim?.();

    if (!apiKey) {
      new Notice(
        "Set your OpenAI Whisper API key in the CRM settings before transcribing."
      );
      return null;
    }

    const key = file.path;

    const existing = this.getTranscriptionNoteFile(file);

    if (existing) {
      new Notice("Transcription already exists for this audio. Opening note.");
      this.refreshAudioEmbeds(file.path);
      this.openTranscriptionFile(existing, originPath ?? file.path);
      return existing;
    }

    if (this.activeTranscriptions.has(key)) {
      new Notice("A transcription is already in progress for this audio file.");
      return null;
    }

    this.activeTranscriptions.add(key);
    this.refreshAudioEmbeds(file.path);
    new Notice("Transcribing audio…");

    try {
      const transcript = await this.createTranscription(apiKey, file);
      const note = await this.writeMarkdownNote(file, transcript);
      new Notice("Transcription note ready.");
      this.refreshAudioEmbeds(file.path);
      return note;
    } catch (error) {
      console.error("CRM: failed to transcribe audio note", error);
      const message =
        error instanceof Error ? error.message : "Unknown transcription error.";
      new Notice(`Transcription failed: ${message}`);
    } finally {
      this.activeTranscriptions.delete(key);
      this.refreshAudioEmbeds(file.path);
    }

    return null;
  };

  decorateMarkdown = (
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ) => {
    const embeds = Array.from(
      element.querySelectorAll<HTMLElement>(
        "div.internal-embed.media-embed, div.internal-embed.audio-embed"
      )
    );

    embeds.forEach((embed) => {
      const audio = embed.querySelector("audio");
      if (!audio) {
        return;
      }

      const audioFile = this.getAudioFileFromEmbed(embed, context.sourcePath);

      if (!audioFile || !this.isAudioFile(audioFile)) {
        return;
      }

      embed.setAttribute("data-crm-audio-path", audioFile.path);
      this.renderedEmbeds.set(embed, context.sourcePath);

      let actions = embed.querySelector<HTMLElement>(".crm-audio-actions");
      if (!actions) {
        actions = embed.createDiv({ cls: "crm-audio-actions" });
      }

      this.renderActionButtons(actions, audioFile, context.sourcePath);
    });
  };

  openTranscription = (audioFile: TFile, originPath?: string) => {
    const note = this.getTranscriptionNoteFile(audioFile);

    if (!note) {
      new Notice("No transcription note found for this audio yet.");
      return;
    }

    this.openTranscriptionFile(note, originPath ?? audioFile.path);
  };

  hasExistingTranscription = (file: TFile) => {
    return Boolean(this.getTranscriptionNoteFile(file));
  };

  isTranscriptionInProgress = (file: TFile) => {
    return this.activeTranscriptions.has(file.path);
  };

  private getTranscriptionNotePath = (file: TFile) => {
    const directory = file.parent?.path ?? "";
    const transcriptionBasename = `${file.basename}-transcription`;
    const notePath = `${
      directory ? `${directory}/` : ""
    }${transcriptionBasename}.md`;
    return notePath;
  };

  private getTranscriptionNoteFile = (file: TFile) => {
    const notePath = this.getTranscriptionNotePath(file);
    const existing = this.plugin.app.vault.getAbstractFileByPath(notePath);

    if (existing instanceof TFile) {
      return existing;
    }

    return null;
  };

  private createTranscription = async (apiKey: string, file: TFile) => {
    const buffer = await this.plugin.app.vault.adapter.readBinary(file.path);
    const blob = new Blob([buffer], { type: getMimeFromExtension(file.extension) });

    const formData = new FormData();
    formData.append("model", TRANSCRIPTION_MODEL);
    formData.append("file", blob, file.name);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = response.statusText || "Request failed";

      try {
        const payload = await response.json();
        errorMessage = payload?.error?.message ?? errorMessage;
      } catch (parseError) {
        console.warn(
          "CRM: unable to parse transcription error payload",
          parseError
        );
      }

      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const transcript: Maybe<string> =
      payload?.text ??
      payload?.transcription ??
      payload?.results?.[0]?.text ??
      payload?.results?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript || !String(transcript).trim()) {
      throw new Error("Received an empty transcription result.");
    }

    return String(transcript).trim();
  };

  private writeMarkdownNote = async (file: TFile, transcript: string) => {
    const notePath = this.getTranscriptionNotePath(file);
    const embed = `![[${file.name}]]`;
    const noteContent = `${embed}\n\n${transcript}\n`;

    const existing = this.plugin.app.vault.getAbstractFileByPath(notePath);

    if (existing instanceof TFile) {
      await this.plugin.app.vault.modify(existing, noteContent);
      return existing;
    }

    return this.plugin.app.vault.create(notePath, noteContent);
  };

  private renderActionButtons = (
    container: HTMLElement,
    audioFile: TFile,
    originPath: string
  ) => {
    container.replaceChildren();
    container.classList.add("crm-audio-actions");

    const transcription = this.getTranscriptionNoteFile(audioFile);
    const inProgress = this.activeTranscriptions.has(audioFile.path);

    const transcribeButton = container.createEl("button", {
      cls: "crm-audio-action-button mod-cta",
    });
    transcribeButton.setAttr("type", "button");
    transcribeButton.setAttr(
      "title",
      "Transcribe this recording with Whisper and link the note"
    );
    const transcribeIcon = transcribeButton.createSpan({
      cls: "crm-audio-action-icon",
    });
    setIcon(transcribeIcon, inProgress ? "loader-2" : "wand-2");
    transcribeButton.createSpan({
      text: inProgress ? "Transcribing…" : "Transcribe",
    });

    transcribeButton.disabled = inProgress;

    transcribeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.transcribeAudioFile(audioFile, originPath);
    });

    if (transcription) {
      const openButton = container.createEl("button", {
        cls: "crm-audio-action-button",
      });
      openButton.setAttr("type", "button");
      openButton.setAttr(
        "title",
        "Open the linked transcription note in a new pane"
      );
      const openIcon = openButton.createSpan({ cls: "crm-audio-action-icon" });
      setIcon(openIcon, "file-text");
      openButton.createSpan({ text: "Open transcription" });

      openButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openTranscription(audioFile, originPath);
      });
    }
  };

  private refreshAudioEmbeds = (audioPath: string) => {
    if (!audioPath) {
      return;
    }

    const file = this.plugin.app.vault.getAbstractFileByPath(audioPath);

    if (!(file instanceof TFile)) {
      return;
    }

    const selectorPath = audioPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const selector = `[data-crm-audio-path="${selectorPath}"]`;
    const embeds = Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    );

    embeds.forEach((embed) => {
      const origin = this.renderedEmbeds.get(embed) ?? file.path;
      const container = embed.querySelector<HTMLElement>(".crm-audio-actions");

      if (!container) {
        return;
      }

      this.renderActionButtons(container, file, origin);
    });
  };

  private openTranscriptionFile = (note: TFile, originPath: string) => {
    this.plugin.app.workspace.openLinkText(note.path, originPath, false);
  };

  private getAudioFileFromEmbed = (
    embed: HTMLElement,
    sourcePath: string
  ): TFile | null => {
    const raw =
      embed.getAttribute("src") ??
      embed.getAttribute("data-src") ??
      (embed as HTMLElement & { dataset?: DOMStringMap }).dataset?.src ??
      "";

    let cleaned = raw.trim();
    if (cleaned.startsWith("!")) {
      cleaned = cleaned.slice(1);
    }
    if (cleaned.startsWith("[[")) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.endsWith("]]")) {
      cleaned = cleaned.slice(0, -2);
    }

    const linkPath = cleaned.split("|")[0]?.trim?.() ?? "";

    if (!linkPath) {
      return null;
    }

    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
      linkPath,
      sourcePath
    );

    if (file instanceof TFile) {
      return file;
    }

    return null;
  };
}
