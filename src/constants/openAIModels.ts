// OpenAI models for Edit with AI
export const OPENAI_EDIT_MODELS = [
  { value: "gpt-5", label: "gpt-5" },
  { value: "gpt-5-mini", label: "gpt-5-mini" },
  { value: "gpt-5-nano", label: "gpt-5-nano" },
  { value: "gpt-4.1", label: "gpt-4.1" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano" },
] as const;

// Gemini models for Edit with AI
export const GEMINI_EDIT_MODELS = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (most capable)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (faster)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
] as const;

export const DEFAULT_OPENAI_EDIT_MODEL = "gpt-5-mini";
export const DEFAULT_GEMINI_EDIT_MODEL = "gemini-2.5-flash";

// Legacy export (kept for backwards compat, defaults to OpenAI)
export const EDIT_WITH_AI_MODEL_OPTIONS = OPENAI_EDIT_MODELS;
export const DEFAULT_EDIT_WITH_AI_MODEL = DEFAULT_OPENAI_EDIT_MODEL;

const LEGACY_MODEL_MAP: Record<string, string> = {
  gpt5: "gpt-5",
  "gpt5-mini": "gpt-5-mini",
  "gpt5-nano": "gpt-5-nano",
  gpt4: "gpt-4.1",
  "gpt4-mini": "gpt-4.1-mini",
  "gpt4-nano": "gpt-4.1-nano",
};

export const normalizeEditWithAIModel = (
  model: unknown,
  providerId: "openai" | "gemini" = "openai"
): string => {
  if (typeof model !== "string") {
    return providerId === "gemini"
      ? DEFAULT_GEMINI_EDIT_MODEL
      : DEFAULT_OPENAI_EDIT_MODEL;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return providerId === "gemini"
      ? DEFAULT_GEMINI_EDIT_MODEL
      : DEFAULT_OPENAI_EDIT_MODEL;
  }

  const modelsForProvider =
    providerId === "gemini" ? GEMINI_EDIT_MODELS : OPENAI_EDIT_MODELS;

  const directMatch = modelsForProvider.find(
    (option) => option.value === trimmed
  );
  if (directMatch) {
    return directMatch.value;
  }

  const legacyMatch = LEGACY_MODEL_MAP[trimmed];
  if (legacyMatch) {
    return legacyMatch;
  }

  return providerId === "gemini"
    ? DEFAULT_GEMINI_EDIT_MODEL
    : DEFAULT_OPENAI_EDIT_MODEL;
};
