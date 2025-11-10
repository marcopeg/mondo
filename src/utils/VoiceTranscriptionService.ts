import type Mondo from "@/main";
import { createAiProvider } from "@/ai/providerFactory";
import {
  getAiApiKey,
  getMissingAiApiKeyMessage,
  getSelectedAiProviderId,
} from "@/ai/settings";

const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export class VoiceTranscriptionService {
  private readonly plugin: Mondo;

  constructor(plugin: Mondo) {
    this.plugin = plugin;
  }

  getApiKey = () => getAiApiKey(this.plugin.settings);

  hasApiKey = () => Boolean(this.getApiKey());

  getSelectedModel = () => {
    const providerId = getSelectedAiProviderId(this.plugin.settings);

    if (providerId === "gemini") {
      return DEFAULT_GEMINI_MODEL;
    }

    const model = this.plugin.settings?.openAIModel;
    if (typeof model !== "string" || !model.trim()) {
      return DEFAULT_OPENAI_MODEL;
    }

    return model.trim();
  };

  isPolishEnabled = () => {
    const flag = this.plugin.settings?.openAITranscriptionPolishEnabled;
    return flag !== false;
  };

  getMissingApiKeyMessage = () => getMissingAiApiKeyMessage(this.plugin.settings);

  private ensureApiKey = () => {
    const key = this.getApiKey();
    if (!key) {
      throw new Error(this.getMissingApiKeyMessage());
    }
    return key;
  };

  private createProvider = () => {
    const providerId = getSelectedAiProviderId(this.plugin.settings);
    const apiKey = this.ensureApiKey();
    return createAiProvider(providerId, apiKey);
  };

  transcribe = async (audio: Blob, options: { signal?: AbortSignal } = {}) => {
    const provider = this.createProvider();
    return provider.transcribeAudio({ audio, signal: options.signal });
  };

  polish = async (transcript: string, options: { signal?: AbortSignal } = {}) => {
    const provider = this.createProvider();
    const model = this.getSelectedModel();

    const prompt = `You are an expert transcription curator.\nTake this raw voice transcript and polish it from the classic vocalization issues.\nMake the minimum intervention possible.\n\nTRANSCRIPT:\n${transcript}`;

    const text = await provider.generateText({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      signal: options.signal,
    });

    return text.trim();
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
