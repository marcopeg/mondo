import { AiProvider, AiProviderId } from "@/ai/types";
import { OpenAiProvider } from "@/ai/providers/OpenAiProvider";
import { GoogleGeminiProvider } from "@/ai/providers/GoogleGeminiProvider";

export const createAiProvider = (
  id: AiProviderId,
  apiKey: string
): AiProvider => {
  if (id === "gemini") {
    return new GoogleGeminiProvider(apiKey);
  }

  return new OpenAiProvider(apiKey);
};
