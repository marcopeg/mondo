export type AiProviderId = "openai" | "gemini";

export type AiMessageRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  readonly defaultVoices: readonly string[];
  transcribeAudio(options: {
    audio: Blob;
    mimeType?: string;
    signal?: AbortSignal;
  }): Promise<string>;
  generateText(options: {
    messages: AiMessage[];
    model?: string;
    signal?: AbortSignal;
  }): Promise<string>;
  listVoices(options?: { signal?: AbortSignal }): Promise<string[]>;
  synthesizeSpeech(options: {
    text: string;
    voice: string;
    signal?: AbortSignal;
  }): Promise<ArrayBuffer>;
}

export const AI_PROVIDER_DEFINITIONS: ReadonlyArray<{
  id: AiProviderId;
  label: string;
}> = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Google Gemini" },
] as const;

const AI_PROVIDER_LABEL_LOOKUP = new Map(
  AI_PROVIDER_DEFINITIONS.map((entry) => [entry.id, entry.label])
);

export const normalizeAiProviderId = (value: unknown): AiProviderId => {
  if (value === "gemini") {
    return "gemini";
  }

  return "openai";
};

export const getAiProviderLabel = (id: AiProviderId): string =>
  AI_PROVIDER_LABEL_LOOKUP.get(id) ?? "AI provider";
