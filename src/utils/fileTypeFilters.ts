import type { TFile } from "obsidian";

const normalizeExtension = (file: TFile): string =>
  file.extension.toLowerCase();

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "tiff",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "flac",
  "opus",
]);

export const isMarkdownFile = (file: TFile): boolean =>
  normalizeExtension(file) === "md";

export const isImageFile = (file: TFile): boolean =>
  IMAGE_EXTENSIONS.has(normalizeExtension(file));

export const isAudioFile = (file: TFile): boolean =>
  AUDIO_EXTENSIONS.has(normalizeExtension(file));

export const isOtherVaultFile = (file: TFile): boolean =>
  !isMarkdownFile(file) && !isImageFile(file) && !isAudioFile(file);

export const getFileCategory = (file: TFile):
  | "note"
  | "image"
  | "audio"
  | "other" => {
  if (isMarkdownFile(file)) return "note";
  if (isImageFile(file)) return "image";
  if (isAudioFile(file)) return "audio";
  return "other";
};
