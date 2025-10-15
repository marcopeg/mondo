import type CRM from "@/main";
import {
  Modal,
  Notice,
  TFile,
  normalizePath,
  type App,
  type Editor,
} from "obsidian";

const VOICEOVER_MODEL = "gpt-4o-mini-tts";
const FALLBACK_VOICES = [
  "alloy",
  "ash",
  "coral",
  "ember",
  "lumen",
  "pearl",
  "sage",
  "sol",
];

const DEFAULT_VOICEOVER_CACHE_PATH = "/voiceover";

const AUDIO_MIME_TYPE = "audio/mpeg";
const VOICE_PREVIEW_TEXT =
  "Hello from Obsidian CRM. This is a quick voice preview.";

type VoicesResponse = {
  voices?: unknown;
  data?: unknown;
};

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
      console.warn("CRM: failed to hash content via Web Crypto", error);
    }
  }

  return computeFallbackHash(content);
};

const resolveVoiceName = (input: unknown) => {
  if (!input) {
    return null;
  }

  if (typeof input === "string") {
    return input.trim() || null;
  }

  if (typeof input !== "object") {
    return null;
  }

  const candidate =
    (input as Record<string, unknown>).id ??
    (input as Record<string, unknown>).name ??
    (input as Record<string, unknown>).voice ??
    (input as Record<string, unknown>).value;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
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
    this.modalEl.addClass("crm-voiceover-modal");
    this.titleEl.setText("Voiceover");

    this.statusEl = this.contentEl.createEl("p", {
      cls: "crm-voiceover-status",
    });

    this.audioContainerEl = this.contentEl.createDiv({
      cls: "crm-voiceover-audio",
    });

    this.buttonsEl = this.contentEl.createDiv({
      cls: "crm-voiceover-buttons",
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
      console.warn("CRM: unable to autoplay voiceover", error);
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
        cls: "crm-voiceover-button",
        text: config.text,
      });
      if (config.variant === "accent") {
        button.addClass("crm-voiceover-button--accent");
      }
      if (config.variant === "neutral") {
        button.addClass("crm-voiceover-button--neutral");
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
  private readonly plugin: CRM;
  private cachedVoices: string[] | undefined;
  private readonly activeNotes = new Map<string, AbortController>();
  private previewAudio: HTMLAudioElement | null = null;
  private previewUrl: string | null = null;
  private previewController: AbortController | null = null;

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    // Placeholder for potential initialization work.
  };

  dispose = () => {
    this.cachedVoices = undefined;
    this.activeNotes.clear();
    this.previewController?.abort();
    this.previewController = null;
    this.stopPreview();
  };

  getAvailableVoices = async (): Promise<string[]> => {
    if (this.cachedVoices) {
      return this.cachedVoices;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch("https://api.openai.com/v1/audio/voices", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw await this.resolveError(response);
      }

      const payload = (await response.json()) as VoicesResponse;
      const rawList: unknown[] =
        (Array.isArray(payload.voices) ? payload.voices : null) ??
        (Array.isArray(payload.data) ? payload.data : null) ??
        [];

      const voices = rawList
        .map((voice: unknown) => resolveVoiceName(voice))
        .filter((voice): voice is string => typeof voice === "string");

      if (voices.length === 0) {
        this.cachedVoices = [...FALLBACK_VOICES];
      } else {
        const uniqueVoices = Array.from(new Set(voices));
        this.cachedVoices = uniqueVoices.length
          ? uniqueVoices
          : [...FALLBACK_VOICES];
      }
    } catch (error) {
      console.error("CRM: failed to load OpenAI voices", error);
      this.cachedVoices = [...FALLBACK_VOICES];
    }

    const resolved = this.cachedVoices ?? [...FALLBACK_VOICES];
    this.cachedVoices = resolved;
    return resolved;
  };

  generateVoiceover = async (
    file: TFile,
    _editor: Editor | null,
    selectedText: string
  ) => {
    const trimmed = selectedText.trim();

    if (!trimmed) {
      new Notice("Provide some text before generating a voiceover.");
      return;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      new Notice(
        "Set your OpenAI Whisper API key in the CRM settings before generating a voiceover."
      );
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

      const contentHash = await hashContent(`${voice}::${trimmed}`);
      const existing = await this.findExistingVoiceover(
        cacheDirectory,
        contentHash
      );

      if (existing) {
        voiceoverModal.showPlayer(existing);
        return;
      }

      const controller = new AbortController();
      this.activeNotes.set(file.path, controller);

      voiceoverModal.showGenerating(() => {
        controller.abort();
        voiceoverModal.setStatus("Cancelling voiceover…");
      });

      const audioBuffer = await this.requestVoiceover(
        trimmed,
        voice,
        apiKey,
        controller.signal
      );

      const audioFile = await this.saveAudioFile(
        file,
        audioBuffer,
        cacheDirectory,
        contentHash
      );

      voiceoverModal.showPlayer(audioFile);
      new Notice(`Voiceover saved to ${audioFile.path}`);
    } catch (error) {
      const abortError =
        error instanceof Error && error.name === "AbortError";
      if (abortError) {
        console.info("CRM: voiceover generation cancelled");
        voiceoverModal.showError("Voiceover generation cancelled.");
      } else {
        console.error("CRM: failed to generate voiceover", error);
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

    const voices = await this.getAvailableVoices();
    if (voices.length === 0) {
      return FALLBACK_VOICES[0];
    }

    const voice = voices[0];
    this.plugin.settings.openAIVoice = voice;
    await this.plugin.saveSettings();
    return voice;
  };

  private getApiKey = () =>
    this.plugin.settings?.openAIWhisperApiKey?.trim?.() ?? "";

  previewVoice = async (voice: string) => {
    const trimmed = voice?.trim?.();

    if (!trimmed) {
      throw new Error("Select a voice to preview.");
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        "Set your OpenAI Whisper API key in the CRM settings before previewing voices."
      );
    }

    this.previewController?.abort();
    this.previewController = null;
    this.stopPreview();

    const controller = new AbortController();
    this.previewController = controller;

    try {
      const audioBuffer = await this.requestVoiceover(
        VOICE_PREVIEW_TEXT,
        trimmed,
        apiKey,
        controller.signal
      );

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

      console.error("CRM: failed to preview voice", error);

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

  private requestVoiceover = async (
    text: string,
    voice: string,
    apiKey: string,
    signal: AbortSignal
  ) => {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: AUDIO_MIME_TYPE,
      },
      body: JSON.stringify({
        model: VOICEOVER_MODEL,
        voice,
        input: text,
      }),
      signal,
    });

    if (!response.ok) {
      throw await this.resolveError(response);
    }

    return response.arrayBuffer();
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

  private resolveError = async (response: Response) => {
    try {
      const payload = await response.json();
      const message =
        payload?.error?.message ?? payload?.message ?? response.statusText;
      return new Error(message || "Request failed");
    } catch (error) {
      console.warn("CRM: unable to parse OpenAI error response", error);
      return new Error(response.statusText || "Request failed");
    }
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
      console.error("CRM: failed to list voiceover cache folder", error);
      return null;
    }
  };
}
