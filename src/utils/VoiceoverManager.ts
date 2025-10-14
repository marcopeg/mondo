import type CRM from "@/main";
import {
  Notice,
  TFile,
  normalizePath,
  type Editor,
  type EditorPosition,
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

const AUDIO_MIME_TYPE = "audio/mpeg";
type SelectionRange = {
  start: EditorPosition;
  end: EditorPosition;
};

type VoicesResponse = {
  voices?: unknown;
  data?: unknown;
};

const sanitizeForFileName = (input: string) =>
  input.replace(/[\\/:*?"<>|]/g, "-").trim();

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

export class VoiceoverManager {
  private readonly plugin: CRM;
  private cachedVoices: string[] | undefined;
  private readonly activeNotes = new Set<string>();

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    // Placeholder for potential initialization work.
  };

  dispose = () => {
    this.cachedVoices = undefined;
    this.activeNotes.clear();
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
    editor: Editor,
    selectedText: string
  ) => {
    const trimmed = selectedText.trim();

    if (!trimmed) {
      new Notice("Select some text before generating a voiceover.");
      return;
    }

    const selectionRange = this.captureSelectionRange(editor);

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

    const voice = await this.resolveVoice();
    this.activeNotes.add(file.path);
    new Notice("Generating voiceover…");

    try {
      const audioBuffer = await this.requestVoiceover(trimmed, voice, apiKey);
      const audioFile = await this.saveAudioFile(file, audioBuffer);
      this.injectAudioEmbed(
        editor,
        file,
        audioFile,
        selectedText,
        selectionRange
      );
      new Notice(`Voiceover saved to ${audioFile.path}`);
    } catch (error) {
      console.error("CRM: failed to generate voiceover", error);
      const message =
        error instanceof Error ? error.message : "Unknown voiceover error.";
      new Notice(`Voiceover failed: ${message}`);
    } finally {
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

  private requestVoiceover = async (
    text: string,
    voice: string,
    apiKey: string
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
    });

    if (!response.ok) {
      throw await this.resolveError(response);
    }

    return response.arrayBuffer();
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

  private saveAudioFile = async (file: TFile, audio: ArrayBuffer) => {
    const baseDirectory = file.parent?.path ?? "";
    const attachmentsDir = baseDirectory
      ? `${baseDirectory}/attachments`
      : "attachments";
    const normalizedDir = normalizePath(attachmentsDir);

    await this.ensureFolder(normalizedDir);

    const vault = this.plugin.app.vault;
    const arrayBuffer = audio;
    const noteBaseName = sanitizeForFileName(file.basename) || "note";
    let attempt = 0;
    let targetPath = "";

    while (true) {
      const suffix = attempt === 0 ? "" : `-${attempt}`;
      const fileName = `Voiceover ${getTimestamp()} ${noteBaseName}${suffix}.mp3`;
      targetPath = normalizePath(`${normalizedDir}/${fileName}`);
      const exists = await vault.adapter.exists(targetPath);
      if (!exists) {
        break;
      }
      attempt += 1;
    }

    const created = await vault.createBinary(targetPath, arrayBuffer);
    return created;
  };

  private ensureFolder = async (folderPath: string) => {
    const vault = this.plugin.app.vault;
    const adapter = vault.adapter;
    const exists = await adapter.exists(folderPath);

    if (exists) {
      return;
    }

    try {
      await vault.createFolder(folderPath);
    } catch (error) {
      if (error instanceof Error && error.message.includes("exist")) {
        return;
      }
      throw error;
    }
  };

  private injectAudioEmbed = (
    editor: Editor,
    sourceFile: TFile,
    audioFile: TFile,
    originalSelection: string,
    range: SelectionRange
  ) => {
    const { metadataCache } = this.plugin.app;
    const linkText = metadataCache.fileToLinktext(
      audioFile,
      sourceFile.path
    );
    const embedText = `\n![[${linkText}]]\n`;
    const insertion = `${originalSelection}${embedText}`;

    editor.replaceRange(insertion, range.start, range.end);

    try {
      const startOffset = editor.posToOffset(range.start);
      const newOffset = startOffset + insertion.length;
      const newCursor = editor.offsetToPos(newOffset);
      editor.setCursor(newCursor);
    } catch (error) {
      console.warn("CRM: unable to reposition cursor after voiceover", error);
    }
  };

  private captureSelectionRange = (editor: Editor): SelectionRange => {
    const [primarySelection] = editor.listSelections();
    if (primarySelection) {
      const normalized = this.normalizeRange(
        primarySelection.anchor,
        primarySelection.head
      );
      if (normalized) {
        return normalized;
      }
    }

    const cursor = this.clonePosition(editor.getCursor());
    return { start: cursor, end: cursor };
  };

  private normalizeRange = (
    anchor?: EditorPosition,
    head?: EditorPosition
  ): SelectionRange | null => {
    if (!anchor || !head) {
      return null;
    }

    const anchorClone = this.clonePosition(anchor);
    const headClone = this.clonePosition(head);

    if (this.isBefore(anchorClone, headClone)) {
      return { start: anchorClone, end: headClone };
    }

    return { start: headClone, end: anchorClone };
  };

  private isBefore = (a: EditorPosition, b: EditorPosition) =>
    a.line < b.line || (a.line === b.line && a.ch <= b.ch);

  private clonePosition = (position: EditorPosition): EditorPosition => ({
    line: position.line,
    ch: position.ch,
  });
}
