const extractFromResponseCollection = (collection: unknown): string | null => {
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

export const extractOpenAIOutputText = (payload: Record<string, unknown>): string => {
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

export const extractOpenAIErrorMessage = async (response: Response): Promise<string> => {
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
