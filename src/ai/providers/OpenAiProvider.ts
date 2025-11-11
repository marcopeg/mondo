import {
  extractOpenAIErrorMessage,
  extractOpenAIOutputText,
} from "@/utils/openAIResponseHelpers";
import { AiMessage, AiProvider } from "@/ai/types";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MODEL = "gpt-5-nano";
const VOICEOVER_MODEL = "gpt-4o-mini-tts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const VOICES_URL = "https://api.openai.com/v1/audio/voices";
const SPEECH_URL = "https://api.openai.com/v1/audio/speech";

const DEFAULT_VOICES = [
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

const toOpenAiMessages = (messages: AiMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export class OpenAiProvider implements AiProvider {
  readonly id = "openai" as const;
  readonly label = "OpenAI";
  readonly defaultVoices = DEFAULT_VOICES;

  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error("Set your AI API key in the Mondo settings.");
    }

    return this.apiKey;
  }

  async transcribeAudio(options: { audio: Blob; signal?: AbortSignal }) {
    const key = this.ensureApiKey();

    const formData = new FormData();
    formData.append("model", TRANSCRIPTION_MODEL);
    formData.append("file", options.audio, "audio.webm");

    const response = await fetch(TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: formData,
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractOpenAIErrorMessage(response);
      throw new Error(message || "Transcription request failed.");
    }

    const payload = (await response.json()) as { text?: string };
    const transcript = typeof payload.text === "string" ? payload.text.trim() : "";

    if (!transcript) {
      throw new Error("Received an empty transcription result.");
    }

    return transcript;
  }

  async generateText(options: {
    messages: AiMessage[];
    model?: string;
    signal?: AbortSignal;
  }) {
    const key = this.ensureApiKey();
    const model = options.model?.trim() || DEFAULT_MODEL;
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: toOpenAiMessages(options.messages),
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractOpenAIErrorMessage(response);
      throw new Error(message || "Model request failed.");
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const text = extractOpenAIOutputText(payload).trim();

    if (!text) {
      throw new Error("The model did not return any text.");
    }

    return text;
  }

  async listVoices(options?: { signal?: AbortSignal }) {
    const key = this.ensureApiKey();
    try {
      const response = await fetch(VOICES_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: options?.signal,
      });

      if (!response.ok) {
        const message = await extractOpenAIErrorMessage(response);
        throw new Error(message || "Voice list request failed.");
      }

      const payload = (await response.json()) as {
        voices?: unknown;
        data?: unknown;
      };

      const rawList: unknown[] =
        (Array.isArray(payload.voices) ? payload.voices : null) ??
        (Array.isArray(payload.data) ? payload.data : null) ??
        [];

      const voices = rawList
        .map((entry) => {
          if (!entry) {
            return null;
          }

          if (typeof entry === "string") {
            return entry.trim() || null;
          }

          if (typeof entry !== "object") {
            return null;
          }

          const candidate =
            (entry as Record<string, unknown>).id ??
            (entry as Record<string, unknown>).name ??
            (entry as Record<string, unknown>).voice ??
            (entry as Record<string, unknown>).value;

          return typeof candidate === "string" && candidate.trim()
            ? candidate.trim()
            : null;
        })
        .filter((voice): voice is string => Boolean(voice));

      if (voices.length === 0) {
        return [...this.defaultVoices];
      }

      return Array.from(new Set(voices));
    } catch (error) {
      console.error("Mondo: failed to load OpenAI voices", error);
      return [...this.defaultVoices];
    }
  }

  async synthesizeSpeech(options: {
    text: string;
    voice: string;
    signal?: AbortSignal;
  }) {
    const key = this.ensureApiKey();
    const response = await fetch(SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: AUDIO_MIME_TYPE,
      },
      body: JSON.stringify({
        model: VOICEOVER_MODEL,
        voice: options.voice,
        input: options.text,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractOpenAIErrorMessage(response);
      throw new Error(message || "Voice synthesis failed.");
    }

    return response.arrayBuffer();
  }
}

export default OpenAiProvider;
