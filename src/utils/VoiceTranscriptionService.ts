import type CRM from "@/main";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MODEL = "gpt-5-nano";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message =
      typeof payload?.error === "object" && payload.error && "message" in payload.error
        ? String((payload.error as Record<string, unknown>).message ?? "")
        : typeof payload?.message === "string"
        ? payload.message
        : null;
    return message && message.trim() ? message.trim() : response.statusText;
  } catch (error) {
    return response.statusText || "Request failed";
  }
};

const extractFromResponseCollection = (
  collection: unknown
): string | null => {
  if (!Array.isArray(collection)) {
    return null;
  }

  for (const item of collection) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as Record<string, unknown>;

    if (typeof entry.text === "string" && entry.text.trim()) {
      return entry.text.trim();
    }

    if (Array.isArray(entry.content)) {
      for (const content of entry.content) {
        if (!content || typeof content !== "object") {
          continue;
        }

        const contentEntry = content as Record<string, unknown>;
        if (typeof contentEntry.text === "string" && contentEntry.text.trim()) {
          return contentEntry.text.trim();
        }
        if (typeof contentEntry.value === "string" && contentEntry.value.trim()) {
          return contentEntry.value.trim();
        }
      }
    }
  }

  return null;
};

const extractModelOutputText = (payload: Record<string, unknown>) => {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const collections = [payload.output, payload.content, payload.data];

  for (const collection of collections) {
    const candidate = extractFromResponseCollection(collection);
    if (candidate) {
      return candidate;
    }
  }

  return "";
};

export class VoiceTranscriptionService {
  private readonly plugin: CRM;

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  getApiKey = () => {
    const key = this.plugin.settings?.openAIWhisperApiKey;
    if (typeof key !== "string") {
      return "";
    }
    return key.trim();
  };

  hasApiKey = () => Boolean(this.getApiKey());

  getSelectedModel = () => {
    const model = this.plugin.settings?.openAIModel;
    if (typeof model !== "string" || !model.trim()) {
      return DEFAULT_MODEL;
    }
    return model.trim();
  };

  isPolishEnabled = () => {
    const flag = this.plugin.settings?.openAITranscriptionPolishEnabled;
    return flag !== false;
  };

  private ensureApiKey = () => {
    const key = this.getApiKey();
    if (!key) {
      throw new Error("Set your OpenAI API key in the CRM settings.");
    }
    return key;
  };

  transcribe = async (audio: Blob, options: { signal?: AbortSignal } = {}) => {
    const apiKey = this.ensureApiKey();

    const formData = new FormData();
    formData.append("model", TRANSCRIPTION_MODEL);
    formData.append("file", audio, "voice-note.webm");

    const response = await fetch(TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "Transcription request failed.");
    }

    const payload = (await response.json()) as { text?: string };
    const transcript = typeof payload.text === "string" ? payload.text.trim() : "";

    if (!transcript) {
      throw new Error("Received an empty transcription result.");
    }

    return transcript;
  };

  polish = async (transcript: string, options: { signal?: AbortSignal } = {}) => {
    const apiKey = this.ensureApiKey();
    const model = this.getSelectedModel();

    const prompt = `You are an expert transcription curator.\nTake this raw voice transcript and polish it from the classic vocalization issues.\nMake the minimum intervention possible.\n\nTRANSCRIPT:\n${transcript}`;

    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "Model request failed.");
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const polished = extractModelOutputText(payload).trim();

    if (!polished) {
      throw new Error("The model did not return any text.");
    }

    return polished;
  };

  process = async (audio: Blob, options: { signal?: AbortSignal } = {}) => {
    const transcript = await this.transcribe(audio, options);
    if (!this.isPolishEnabled()) {
      return transcript;
    }
    return this.polish(transcript, options);
  };
}

export default VoiceTranscriptionService;
