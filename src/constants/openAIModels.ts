export const EDIT_WITH_AI_MODEL_OPTIONS = [
  { value: "gpt-5", label: "gpt-5" },
  { value: "gpt-5-mini", label: "gpt-5-mini" },
  { value: "gpt-5-nano", label: "gpt-5-nano" },
  { value: "gpt-4.1", label: "gpt-4.1" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano" },
] as const;

export const DEFAULT_EDIT_WITH_AI_MODEL = "gpt-5-mini";

const LEGACY_MODEL_MAP: Record<string, string> = {
  gpt5: "gpt-5",
  "gpt5-mini": "gpt-5-mini",
  "gpt5-nano": "gpt-5-nano",
  gpt4: "gpt-4.1",
  "gpt4-mini": "gpt-4.1-mini",
  "gpt4-nano": "gpt-4.1-nano",
};

export const normalizeEditWithAIModel = (model: unknown): string => {
  if (typeof model !== "string") {
    return DEFAULT_EDIT_WITH_AI_MODEL;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return DEFAULT_EDIT_WITH_AI_MODEL;
  }

  const directMatch = EDIT_WITH_AI_MODEL_OPTIONS.find(
    (option) => option.value === trimmed
  );
  if (directMatch) {
    return directMatch.value;
  }

  const legacyMatch = LEGACY_MODEL_MAP[trimmed];
  if (legacyMatch) {
    return legacyMatch;
  }

  return DEFAULT_EDIT_WITH_AI_MODEL;
};
