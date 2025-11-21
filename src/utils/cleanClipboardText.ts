const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;
const MULTIPLE_NEWLINES = /\n{3,}/g;
const CARRIAGE_RETURN = /\r\n?/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;

// Simple BOM (Byte Order Mark) stripper to replace clean-text-utils dependency
// which uses Node.js built-ins not available in Obsidian mobile
const stripBOM = (text: string): string => {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
};

export const cleanClipboardText = (value: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  let text = value;
  text = stripBOM(text);
  // Preserve raw punctuation so Markdown tokens (e.g. `**bold**`, lists) remain untouched.
  text = text.replace(CARRIAGE_RETURN, "\n");
  text = text.replace(/\u00A0/g, " ");
  text = text.replace(ZERO_WIDTH_CHARACTERS, "");
  text = text.replace(TRAILING_WHITESPACE, (match) => (match.endsWith("  ") ? "  " : ""));
  text = text.replace(MULTIPLE_NEWLINES, "\n\n");

  return text;
};
