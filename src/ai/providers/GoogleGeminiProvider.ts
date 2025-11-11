import { AiMessage, AiProvider } from "@/ai/types";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1/models";
const SPEECH_RECOGNITION_URL =
  "https://speech.googleapis.com/v1p1beta1/speech:recognize";
const TEXT_TO_SPEECH_URL =
  "https://texttospeech.googleapis.com/v1/text:synthesize";
const LIST_VOICES_URL = "https://texttospeech.googleapis.com/v1/voices";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TRANSCRIPTION_MODEL = "latest_short";
const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_VOICES = [
  "en-US-Standard-A",
  "en-US-Standard-B",
  "en-US-Neural2-C",
  "en-GB-Standard-A",
];

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read audio content."));
        return;
      }

      const [, base64] = result.split(",");
      resolve(base64 ?? "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to process audio."));
    };
    reader.readAsDataURL(blob);
  });

const decodeBase64ToArrayBuffer = (input: string): ArrayBuffer => {
  const globalObject = globalThis as {
    atob?: (value: string) => string;
    Buffer?: {
      from: (value: string, encoding: string) => {
        toString: (encoding: string) => string;
      };
    };
  };

  let binary: string;

  if (typeof globalObject.atob === "function") {
    binary = globalObject.atob(input);
  } else if (globalObject.Buffer) {
    binary = globalObject.Buffer.from(input, "base64").toString("binary");
  } else {
    throw new Error("Base64 decoding is not supported in this environment.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const buildGenerateUrl = (model: string, apiKey: string) => {
  const normalizedModel = model.trim() || DEFAULT_MODEL;
  const encodedModel = encodeURIComponent(normalizedModel);
  const encodedKey = encodeURIComponent(apiKey);
  return `${GENERATE_CONTENT_BASE}/${encodedModel}:generateContent?key=${encodedKey}`;
};

const buildQueryUrl = (baseUrl: string, apiKey: string) => {
  const encodedKey = encodeURIComponent(apiKey);
  return `${baseUrl}?key=${encodedKey}`;
};

const toGeminiRole = (role: AiMessage["role"]): "user" | "model" =>
  role === "assistant" ? "model" : "user";

const toGeminiParts = (message: AiMessage) => [
  {
    text: message.content,
  },
];

const buildGeminiPayload = (messages: AiMessage[]) => {
  const systemMessages = messages.filter((message) => message.role === "system");
  const conversation = messages.filter((message) => message.role !== "system");

  const contents = conversation.map((message) => ({
    role: toGeminiRole(message.role),
    parts: toGeminiParts(message),
  }));

  const payload: Record<string, unknown> = { contents };

  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      role: "user",
      parts: [
        {
          text: systemMessages
            .map((message) => message.content)
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    };
  }

  return payload;
};

const resolveGeminiText = (payload: unknown): string => {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidates = (payload as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const parts = (candidate as { content?: { parts?: unknown[] } }).content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    const text = parts
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : ""
      )
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
};

const extractGeminiErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    const message = (payload as { error?: { message?: string } }).error?.message;
    return message ?? response.statusText;
  } catch (error) {
    console.warn("Mondo: unable to parse Gemini error payload", error);
    return response.statusText || "Request failed";
  }
};

export class GoogleGeminiProvider implements AiProvider {
  readonly id = "gemini" as const;
  readonly label = "Google Gemini";
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
    const content = await blobToBase64(options.audio);

    const response = await fetch(buildQueryUrl(SPEECH_RECOGNITION_URL, key), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          enableAutomaticPunctuation: true,
          languageCode: DEFAULT_LANGUAGE,
          model: DEFAULT_TRANSCRIPTION_MODEL,
        },
        audio: {
          content,
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractGeminiErrorMessage(response);
      throw new Error(message || "Transcription request failed.");
    }

    const payload = (await response.json()) as {
      results?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };

    const transcripts = payload.results?.flatMap((result) =>
      (result.alternatives ?? []).map((entry) => entry.transcript?.trim() ?? "")
    );

    const transcript = transcripts?.find((entry) => entry)?.trim() ?? "";

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
    const url = buildGenerateUrl(options.model ?? DEFAULT_MODEL, key);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildGeminiPayload(options.messages)),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractGeminiErrorMessage(response);
      throw new Error(message || "Model request failed.");
    }

    const payload = await response.json();
    const text = resolveGeminiText(payload);

    if (!text) {
      throw new Error("The model did not return any text.");
    }

    return text;
  }

  async listVoices(options?: { signal?: AbortSignal }) {
    const key = this.ensureApiKey();

    try {
      const response = await fetch(buildQueryUrl(LIST_VOICES_URL, key), {
        method: "GET",
        signal: options?.signal,
      });

      if (!response.ok) {
        const message = await extractGeminiErrorMessage(response);
        throw new Error(message || "Voice list request failed.");
      }

      const payload = (await response.json()) as {
        voices?: Array<{ name?: string }>;
      };

      const voices = (payload.voices ?? [])
        .map((voice) => voice.name?.trim() ?? "")
        .filter(Boolean);

      if (voices.length === 0) {
        return [...this.defaultVoices];
      }

      return Array.from(new Set(voices));
    } catch (error) {
      console.error("Mondo: failed to load Gemini voices", error);
      return [...this.defaultVoices];
    }
  }

  async synthesizeSpeech(options: {
    text: string;
    voice: string;
    signal?: AbortSignal;
  }) {
    const key = this.ensureApiKey();
    const response = await fetch(buildQueryUrl(TEXT_TO_SPEECH_URL, key), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          text: options.text,
        },
        voice: {
          name: options.voice,
          languageCode: options.voice.split("-").slice(0, 2).join("-") || DEFAULT_LANGUAGE,
        },
        audioConfig: {
          audioEncoding: "MP3",
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const message = await extractGeminiErrorMessage(response);
      throw new Error(message || "Voice synthesis failed.");
    }

    const payload = (await response.json()) as { audioContent?: string };
    const audioContent = payload.audioContent?.trim() ?? "";

    if (!audioContent) {
      throw new Error("The voice synthesis response was empty.");
    }

    return decodeBase64ToArrayBuffer(audioContent);
  }
}

export default GoogleGeminiProvider;
