import { replace, strip } from "clean-text-utils";

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;
const MULTIPLE_NEWLINES = /\n{3,}/g;
const CARRIAGE_RETURN = /\r\n?/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;

export const cleanClipboardText = (value: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  let text = value;
  text = strip.bom(text);
  text = replace.exoticChars(text);
  text = text.replace(CARRIAGE_RETURN, "\n");
  text = text.replace(/\u00A0/g, " ");
  text = text.replace(ZERO_WIDTH_CHARACTERS, "");
  text = text.replace(TRAILING_WHITESPACE, "");
  text = text.replace(MULTIPLE_NEWLINES, "\n\n");

  return text.trim();
};
