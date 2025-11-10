import {
  AI_PROVIDER_DEFINITIONS,
  AiProviderId,
  getAiProviderLabel,
  normalizeAiProviderId,
} from "@/ai/types";

export const getAiApiKey = (settings: unknown): string => {
  if (!settings || typeof settings !== "object") {
    return "";
  }

  const value = (settings as { aiApiKey?: unknown }).aiApiKey;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const legacy = (settings as { openAIWhisperApiKey?: unknown })
    .openAIWhisperApiKey;
  if (typeof legacy === "string" && legacy.trim()) {
    return legacy.trim();
  }

  return "";
};

export const setAiApiKey = (settings: unknown, value: string) => {
  if (!settings || typeof settings !== "object") {
    return;
  }

  const trimmed = value.trim();
  (settings as { aiApiKey?: string }).aiApiKey = trimmed;
  (settings as { openAIWhisperApiKey?: string }).openAIWhisperApiKey = trimmed;
};

export const getSelectedAiProviderId = (settings: unknown): AiProviderId => {
  if (!settings || typeof settings !== "object") {
    return "openai";
  }

  const raw = (settings as { aiProvider?: unknown }).aiProvider;
  return normalizeAiProviderId(raw);
};

export const getSelectedAiProviderLabel = (settings: unknown): string =>
  getAiProviderLabel(getSelectedAiProviderId(settings));

export const getMissingAiApiKeyMessage = (settings: unknown) => {
  const label = getSelectedAiProviderLabel(settings) || "AI provider";
  return `Set your ${label} API key in the Mondo settings.`;
};

export const getAiProviderOptions = () => AI_PROVIDER_DEFINITIONS;
