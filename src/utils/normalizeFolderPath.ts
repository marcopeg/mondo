export const normalizeFolderPath = (rawPath?: string): string => {
  if (!rawPath) {
    return "";
  }

  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const forwardSlashes = trimmed.replace(/\\/g, "/");
  const withoutDuplicateSeparators = forwardSlashes.replace(/\/+/g, "/");
  return withoutDuplicateSeparators.replace(/^\/+/, "").replace(/\/+$/, "");
};

export default normalizeFolderPath;
