import type Mondo from "@/main";
import {
  Modal,
  Notice,
  TFile,
  normalizePath,
  type App,
  type Editor,
} from "obsidian";
import { createAiProvider } from "@/ai/providerFactory";
import {
  getAiApiKey,
  getMissingAiApiKeyMessage,
  getSelectedAiProviderId,
} from "@/ai/settings";

const DEFAULT_VOICEOVER_CACHE_PATH = "/voiceover";

const AUDIO_MIME_TYPE = "audio/mpeg";
const VOICE_PREVIEW_TEXT =
  "Hello from Obsidian Mondo. This is a quick voice preview.";

const getTimestamp = () => {
  const now = new Date();
  const parts = [
    now.getFullYear().toString(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ];

  return parts.join("");
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const computeFallbackHash = (content: string) => {
  let hash = 5381;

  for (let index = 0; index < content.length; index += 1) {
    hash = (hash * 33) ^ content.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const hashContent = async (content: string) => {
  const crypto = (globalThis as { crypto?: Crypto }).crypto;

  if (crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const digest = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(content)
      );
      return toHex(digest);
    } catch (error) {
      console.warn("Mondo: failed to hash content via Web Crypto", error);
    }
  }

  return computeFallbackHash(content);
};

class VoiceoverModal extends Modal {
  private readonly noteTitle: string;
  private statusEl!: HTMLParagraphElement;
  private audioContainerEl!: HTMLDivElement;
  private buttonsEl!: HTMLDivElement;
  private audioEl: HTMLAudioElement | null = null;
  private cancelHandler: (() => void) | null = null;

  constructor(app: App, noteTitle: string) {
    super(app);
    this.noteTitle = noteTitle;
  }

  onOpen() {
    this.modalEl.addClass("mondo-voiceover-modal");
    this.titleEl.setText("Voiceover");

    this.statusEl = this.contentEl.createEl("p", {
      cls: "mondo-voiceover-status",
    });

    this.audioContainerEl = this.contentEl.createDiv({
      cls: "mondo-voiceover-audio",
    });

    this.buttonsEl = this.contentEl.createDiv({
      cls: "mondo-voiceover-buttons",
    });

    this.setStatus("Preparing voiceover…");
  }

  onClose() {
    this.audioEl?.pause();
    this.audioEl = null;
    this.cancelHandler = null;
    this.contentEl.empty();
  }

  setStatus = (message: string) => {
    this.statusEl.setText(message);
    this.clearButtons();
    this.clearAudio();
  };

  showGenerating = (onCancel: () => void) => {
    this.titleEl.setText("Generating voiceover");
    this.statusEl.setText("Generating audio…");
    this.clearAudio();
    this.cancelHandler = onCancel;
    this.renderButtons([
      {
        text: "Cancel",
        action: () => {
          this.cancelHandler?.();
        },
        variant: "neutral",
      },
    ]);
  };

  showPlayer = (file: TFile) => {
    this.titleEl.setText(`playing: ${this.noteTitle}`);
    this.statusEl.setText("Voiceover ready to play.");
    this.clearAudio();
    this.cancelHandler = null;
    const audioPath = this.app.vault.getResourcePath(file);
    this.audioEl = this.audioContainerEl.createEl("audio", {
      attr: { controls: "true" },
    });
    this.audioEl.src = audioPath;
    void this.audioEl.play().catch((error) => {
      console.warn("Mondo: unable to autoplay voiceover", error);
    });
    this.renderButtons([
      {
        text: "Close",
        action: () => this.close(),
        variant: "accent",
      },
    ]);
  };

  showError = (message: string) => {
    this.titleEl.setText("Voiceover error");
    this.statusEl.setText(message);
    this.clearAudio();
    this.cancelHandler = null;
    this.renderButtons([
      {
        text: "Close",
        action: () => this.close(),
        variant: "accent",
      },
    ]);
  };

  private clearAudio = () => {
    this.audioEl?.pause();
    this.audioContainerEl.empty();
    this.audioEl = null;
  };

  private renderButtons = (
    buttons: Array<{
      text: string;
      action: () => void;
      variant?: "accent" | "neutral";
    }>
  ) => {
    this.clearButtons();
    buttons.forEach((config) => {
      const button = this.buttonsEl.createEl("button", {
        cls: "mondo-voiceover-button",
        text: config.text,
      });
      if (config.variant === "accent") {
        button.addClass("mondo-voiceover-button--accent");
      }
      if (config.variant === "neutral") {
        button.addClass("mondo-voiceover-button--neutral");
      }
      button.addEventListener("click", () => {
        config.action();
      });
    });
  };

  private clearButtons = () => {
    this.buttonsEl.empty();
  };
}

export class VoiceoverManager {
  private readonly plugin: Mondo;
  private cachedVoices: string[] | undefined;
  private cachedVoicesProvider: string | null = null;
  private readonly activeNotes = new Map<string, AbortController>();
  private previewAudio: HTMLAudioElement | null = null;
  private previewUrl: string | null = null;
  private previewController: AbortController | null = null;

  constructor(plugin: Mondo) {
    this.plugin = plugin;
  }

  private getProviderId = () => getSelectedAiProviderId(this.plugin.settings);

  private getMissingApiKeyMessage = () =>
    getMissingAiApiKeyMessage(this.plugin.settings);

  private getProviderDetails = (requireKey: boolean) => {
    const providerId = this.getProviderId();
    const apiKey = getAiApiKey(this.plugin.settings);

    if (requireKey && !apiKey) {
      throw new Error(this.getMissingApiKeyMessage());
    }

    return {
      providerId,
      apiKey,
      provider: createAiProvider(providerId, apiKey),
    };
  };

  initialize = () => {
    // Placeholder for potential initialization work.
  };

  dispose = () => {
    this.cachedVoices = undefined;
    this.cachedVoicesProvider = null;
    this.activeNotes.clear();
    this.previewController?.abort();
    this.previewController = null;
    this.stopPreview();
  };

  // Ensure the voice is valid for the currently selected provider.
  // If the currently stored voice belongs to another provider (e.g. 'ash' from OpenAI
  // while using Gemini), fall back to a sensible default for that provider.
  private ensureVoiceForProvider = async (
    providerId: string,
    voice: string
  ): Promise<string> => {
    const trimmed = voice?.trim?.() ?? "";
    const available = await this.getAvailableVoices();

    if (trimmed && available.includes(trimmed)) {
      return trimmed;
    }

    if (providerId === "gemini") {
      // Prefer a good neural US English default for Gemini
      return "en-US-Neural2-C";
    }

    // Default to the first available voice (OpenAI or others)
    return available[0] ?? "alloy";
  };

  getAvailableVoices = async (): Promise<string[]> => {
    const { provider, providerId, apiKey } = this.getProviderDetails(false);

    if (this.cachedVoices && this.cachedVoicesProvider === providerId) {
      return this.cachedVoices;
    }

    const fallbackVoices = [...provider.defaultVoices];

    if (!apiKey) {
      this.cachedVoices = fallbackVoices;
      this.cachedVoicesProvider = providerId;
      return fallbackVoices;
    }

    try {
      const voices = await provider.listVoices();
      const resolved = voices.length ? voices : fallbackVoices;
      this.cachedVoices = resolved;
    } catch (error) {
      console.error(
        `Mondo: failed to load ${provider.label} voices`,
        error
      );
      this.cachedVoices = fallbackVoices;
    }

    this.cachedVoicesProvider = providerId;
    return this.cachedVoices ?? fallbackVoices;
  };

  generateVoiceover = async (
    file: TFile,
    _editor: Editor | null,
    selectedText: string,
    options?: { scope?: "note" | "selection" }
  ) => {
    const scope = options?.scope ?? "selection";
    const trimmed = selectedText.trim();

    if (!trimmed) {
      new Notice("Provide some text before generating a voiceover.");
      return;
    }

    let providerId: string;
    let provider;
    try {
      ({ provider, providerId } = this.getProviderDetails(true));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : this.getMissingApiKeyMessage();
      new Notice(message);
      return;
    }

    if (this.activeNotes.has(file.path)) {
      new Notice("A voiceover is already being generated for this note.");
      return;
    }

    const voiceoverModal = new VoiceoverModal(
      this.plugin.app,
      file.basename || file.name
    );
    voiceoverModal.open();
    voiceoverModal.setStatus("Checking for existing voiceover…");

    try {
      const cacheDirectory = this.resolveVoiceoverDirectory();
      let voice = this.plugin.settings?.openAIVoice?.trim?.() ?? "";
      if (!voice) {
        voice = (await this.resolveVoice()).trim();
      }

      // Normalize to a provider-compatible voice (e.g. map OpenAI 'ash' to Gemini default)
      voice = await this.ensureVoiceForProvider(providerId, voice);

      const contentHash = await hashContent(`${voice}::${trimmed}`);
      const existing = await this.findExistingVoiceover(
        cacheDirectory,
        contentHash
      );

      if (existing) {
        voiceoverModal.showPlayer(existing);
        if (scope === "note") {
          await this.associateVoiceoverWithNote(file, existing);
        }
        return;
      }

      const controller = new AbortController();
      this.activeNotes.set(file.path, controller);

      voiceoverModal.showGenerating(() => {
        controller.abort();
        voiceoverModal.setStatus("Cancelling voiceover…");
      });

      const audioBuffer = await provider.synthesizeSpeech({
        text: trimmed,
        voice,
        signal: controller.signal,
      });

      const audioFile = await this.saveAudioFile(
        file,
        audioBuffer,
        cacheDirectory,
        contentHash
      );

      voiceoverModal.showPlayer(audioFile);
      if (scope === "note") {
        await this.associateVoiceoverWithNote(file, audioFile);
      }
      new Notice(`Voiceover saved to ${audioFile.path}`);
    } catch (error) {
      const abortError =
        error instanceof Error && error.name === "AbortError";
      if (abortError) {
        console.info("Mondo: voiceover generation cancelled");
        voiceoverModal.showError("Voiceover generation cancelled.");
      } else {
        console.error("Mondo: failed to generate voiceover", error);
        const message =
          error instanceof Error ? error.message : "Unknown voiceover error.";
        voiceoverModal.showError(`Voiceover failed: ${message}`);
        new Notice(`Voiceover failed: ${message}`);
      }
    } finally {
      const controller = this.activeNotes.get(file.path);
      if (controller?.signal.aborted) {
        // Already handled via modal state.
      }
      this.activeNotes.delete(file.path);
    }
  };

  private resolveVoice = async () => {
    const selected = this.plugin.settings?.openAIVoice?.trim?.();
    if (selected) {
      return selected;
    }

    const { provider, providerId } = this.getProviderDetails(false);
    const voices = await this.getAvailableVoices();
    
    // Pick provider-appropriate default voice
    let fallbackVoice: string;
    if (providerId === "gemini") {
      fallbackVoice = "en-US-Neural2-C"; // Preferred Gemini voice
    } else {
      fallbackVoice = provider.defaultVoices[0] ?? ""; // OpenAI default
    }

    if (voices.length === 0) {
      if (fallbackVoice) {
        this.plugin.settings.openAIVoice = fallbackVoice;
        await this.plugin.saveSettings();
      }
      return fallbackVoice || "default";
    }

    const voice = voices[0] ?? (fallbackVoice || "default");
    this.plugin.settings.openAIVoice = voice;
    await this.plugin.saveSettings();
    return voice;
  };

  previewVoice = async (voice: string) => {
    const trimmed = voice?.trim?.();

    if (!trimmed) {
      throw new Error("Select a voice to preview.");
    }

    const { provider } = this.getProviderDetails(true);

    this.previewController?.abort();
    this.previewController = null;
    this.stopPreview();

    const controller = new AbortController();
    this.previewController = controller;

    try {
      const audioBuffer = await provider.synthesizeSpeech({
        text: VOICE_PREVIEW_TEXT,
        voice: trimmed,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      this.stopPreview();

      const blob = new Blob([audioBuffer], { type: AUDIO_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      this.previewAudio = audio;
      this.previewUrl = url;

      audio.addEventListener("ended", this.stopPreview);
      audio.addEventListener("error", this.stopPreview);

      await audio.play();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("Mondo: failed to preview voice", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to preview voice.");
    } finally {
      if (this.previewController === controller) {
        this.previewController = null;
      }
    }
  };

  private stopPreview = () => {
    const audio = this.previewAudio;
    if (audio) {
      audio.pause();
      audio.removeEventListener("ended", this.stopPreview);
      audio.removeEventListener("error", this.stopPreview);
      audio.src = "";
    }

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewAudio = null;
    this.previewUrl = null;
  };

  private saveAudioFile = async (
    file: TFile,
    audio: ArrayBuffer,
    directory: string,
    hash: string
  ) => {
    const normalizedDirectory = normalizePath(directory);
    await this.ensureFolder(normalizedDirectory);

    const vault = this.plugin.app.vault;
    const fileName = `Voiceover ${getTimestamp()} ${hash}.mp3`;
    const targetPath = normalizePath(`${normalizedDirectory}/${fileName}`);
    const created = await vault.createBinary(targetPath, audio);
    return created;
  };

  private associateVoiceoverWithNote = async (note: TFile, audio: TFile) => {
    try {
      await this.plugin.app.fileManager.processFrontMatter(note, (frontmatter) => {
        const current =
          typeof frontmatter.voiceover === "string"
            ? frontmatter.voiceover.trim()
            : "";

        const metadataCache = this.plugin.app.metadataCache;
        const linkTarget = metadataCache
          .fileToLinktext(audio, note.path)
          .trim();
        const resolvedTarget = linkTarget || audio.path;
        const voiceoverLink = `[[${resolvedTarget}]]`;

        if (current === voiceoverLink) {
          return;
        }

        frontmatter.voiceover = voiceoverLink;
      });
    } catch (error) {
      console.error("Mondo: failed to associate voiceover with note", error);
    }
  };

  private ensureFolder = async (folderPath: string) => {
    const vault = this.plugin.app.vault;
    const adapter = vault.adapter;
    const normalizedPath = normalizePath(folderPath);
    const exists = await adapter.exists(normalizedPath);

    if (exists) {
      return;
    }

    try {
      await vault.createFolder(normalizedPath);
    } catch (error) {
      if (error instanceof Error && error.message.includes("exist")) {
        return;
      }
      throw error;
    }
  };

  private resolveVoiceoverDirectory = () => {
    const configured = this.plugin.settings?.voiceoverCachePath;
    const trimmed =
      typeof configured === "string" ? configured.trim() : "";
    const resolved = trimmed || DEFAULT_VOICEOVER_CACHE_PATH;
    return normalizePath(resolved);
  };

  private findExistingVoiceover = async (
    directory: string,
    hash: string
  ) => {
    const adapter = this.plugin.app.vault.adapter;
    const normalizedDirectory = normalizePath(directory);
    const exists = await adapter.exists(normalizedDirectory);
    if (!exists) {
      return null;
    }

    try {
      const listing = await adapter.list(normalizedDirectory);
      const match = listing.files.find((filePath) =>
        filePath.endsWith(`${hash}.mp3`)
      );

      if (!match) {
        return null;
      }

      const abstract = this.plugin.app.vault.getAbstractFileByPath(
        normalizePath(match)
      );
      return abstract instanceof TFile ? abstract : null;
    } catch (error) {
      console.error("Mondo: failed to list voiceover cache folder", error);
      return null;
    }
  };
}
