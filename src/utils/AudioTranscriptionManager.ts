import type CRM from "@/main";
import {
  MarkdownView,
  Menu,
  Notice,
  TFile,
  type MarkdownPostProcessorContext,
  type WorkspaceLeaf,
} from "obsidian";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const START_MARKER_PREFIX = "<!--crm-transcription:";
const END_MARKER_PREFIX = "<!--/crm-transcription:";
const EMBED_SELECTOR = ".internal-embed, .media-embed";

const MIME_FALLBACK = "application/octet-stream";
const EXTENSION_TO_MIME: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

type Maybe<T> = T | null | undefined;

type AudioContext = {
  embed: HTMLElement;
  noteFile: TFile;
  audioFile: TFile;
  leaf: WorkspaceLeaf;
};

const getMimeFromExtension = (extension: Maybe<string>) => {
  if (!extension) {
    return MIME_FALLBACK;
  }

  const normalized = extension.replace(/^\./, "").toLowerCase();
  return EXTENSION_TO_MIME[normalized] ?? MIME_FALLBACK;
};

export class AudioTranscriptionManager {
  private readonly plugin: CRM;

  private readonly activeTranscriptions = new Set<string>();

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    this.plugin.registerMarkdownPostProcessor(this.annotateEmbeds);

    this.plugin.registerDomEvent(document, "contextmenu", (event) => {
      if (event instanceof MouseEvent) {
        this.handleContextMenu(event);
      }
    });
  };

  private annotateEmbeds = (
    element: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    const embeds = element.querySelectorAll<HTMLElement>(EMBED_SELECTOR);

    embeds.forEach((embed) => {
      const audio = embed.querySelector("audio");

      if (!audio) {
        return;
      }

      const section = ctx.getSectionInfo(embed);

      if (section) {
        embed.dataset.crmAudioLineStart = String(section.lineStart ?? "");
        embed.dataset.crmAudioLineEnd = String(section.lineEnd ?? "");
      }

      const source = this.extractEmbedSource(embed);

      if (source) {
        embed.dataset.crmAudioSource = source;
      }
    });
  };

  private handleContextMenu = (event: MouseEvent) => {
    const context = this.resolveContext(event);

    if (!context) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const menu = new Menu();

    menu.addItem((item) => {
      item.setTitle("Transcribe audio");
      item.setIcon("lucide-audio-lines");
      item.onClick(() => {
        void this.handleTranscription(context);
      });
    });

    this.plugin.app.workspace.trigger(
      "file-menu",
      menu,
      context.audioFile,
      "crm-audio-embed",
      context.leaf
    );

    menu.showAtMouseEvent(event);
  };

  dispose = () => {
    this.activeTranscriptions.clear();
  };

  private resolveContext = (event: MouseEvent): AudioContext | null => {
    const audio = this.getAudioElementFromEvent(event);

    if (!audio) {
      return null;
    }

    const embed = audio.closest<HTMLElement>(EMBED_SELECTOR);

    if (!embed) {
      return null;
    }

    const leaf = this.findOwningLeaf(embed);

    if (!leaf) {
      return null;
    }

    const view = leaf.view as MarkdownView | undefined;
    const noteFile = view?.file ?? null;

    if (!noteFile) {
      return null;
    }

    const sourcePath =
      embed.dataset.crmAudioSource ?? this.extractEmbedSource(embed);

    if (!sourcePath) {
      return null;
    }

    const normalizedSource = this.normalizeSourcePath(sourcePath);
    const audioFile = this.plugin.app.metadataCache.getFirstLinkpathDest(
      normalizedSource,
      noteFile.path
    );

    if (!audioFile) {
      return null;
    }

    this.ensureEmbedMetadata(embed, noteFile, normalizedSource);

    return {
      embed,
      noteFile,
      audioFile,
      leaf,
    };
  };

  private getAudioElementFromEvent = (
    event: MouseEvent
  ): HTMLMediaElement | null => {
    if (event.target instanceof HTMLMediaElement) {
      return event.target;
    }

    const path = (event.composedPath?.() ?? []) as unknown[];

    for (const candidate of path) {
      if (candidate instanceof HTMLMediaElement) {
        return candidate;
      }

      if (candidate instanceof HTMLElement) {
        const audio = candidate.querySelector<HTMLMediaElement>("audio");

        if (audio) {
          return audio;
        }
      }
    }

    if (event.target instanceof HTMLElement) {
      const container = event.target.closest(EMBED_SELECTOR);
      const audio = container?.querySelector<HTMLMediaElement>("audio") ?? null;

      if (audio) {
        return audio;
      }
    }

    return null;
  };

  private findOwningLeaf = (element: HTMLElement): WorkspaceLeaf | null => {
    return (
      this.plugin.app.workspace
        .getLeavesOfType("markdown")
        .find((candidate: WorkspaceLeaf) => {
          const view = candidate.view as MarkdownView;
          return Boolean(view?.containerEl?.contains(element));
        }) ?? null
    );
  };

  private ensureEmbedMetadata = (
    embed: HTMLElement,
    noteFile: TFile,
    sourcePath: string
  ) => {
    const lineEnd = Number(embed.dataset.crmAudioLineEnd ?? "");

    if (!Number.isNaN(lineEnd)) {
      return;
    }

    const cache = this.plugin.app.metadataCache.getFileCache(noteFile);

    if (!cache?.embeds?.length) {
      return;
    }

    const target = cache.embeds.find((entry) => {
      const normalized = this.normalizeSourcePath(entry.link ?? "");
      return normalized === sourcePath;
    });

    if (!target) {
      return;
    }

    const { position } = target;
    embed.dataset.crmAudioLineStart = String(position.start.line ?? "");
    embed.dataset.crmAudioLineEnd = String(position.end.line ?? "");
  };

  private handleTranscription = async (context: AudioContext) => {
    const apiKey = this.plugin.settings?.openAIWhisperApiKey?.trim?.();

    if (!apiKey) {
      new Notice(
        "Set your OpenAI Whisper API key in the CRM settings before transcribing."
      );
      return;
    }

    const lineEnd = this.getLineEnd(context.embed, context.noteFile);

    if (lineEnd === null) {
      new Notice("Unable to determine where to insert the transcription.");
      return;
    }

    const transcriptionKey = `${context.noteFile.path}::${context.audioFile.path}`;

    if (this.activeTranscriptions.has(transcriptionKey)) {
      new Notice("A transcription is already in progress for this audio file.");
      return;
    }

    this.activeTranscriptions.add(transcriptionKey);
    new Notice("Transcribing audio…");

    try {
      const transcript = await this.createTranscription(apiKey, context.audioFile);
      await this.injectTranscription(context, lineEnd, transcript);
      new Notice("Transcription added to the note.");
    } catch (error) {
      console.error("CRM: failed to transcribe audio", error);
      const message =
        error instanceof Error ? error.message : "Unknown transcription error.";
      new Notice(`Transcription failed: ${message}`);
    } finally {
      this.activeTranscriptions.delete(transcriptionKey);
    }
  };

  private createTranscription = async (apiKey: string, file: TFile) => {
    const buffer = await this.plugin.app.vault.adapter.readBinary(file.path);
    const blob = new Blob([buffer], { type: getMimeFromExtension(file.extension) });

    const formData = new FormData();
    formData.append("model", TRANSCRIPTION_MODEL);
    formData.append("file", blob, file.name);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = response.statusText || "Request failed";

      try {
        const payload = await response.json();
        errorMessage = payload?.error?.message ?? errorMessage;
      } catch (parseError) {
        console.warn(
          "CRM: unable to parse transcription error payload",
          parseError
        );
      }

      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const transcript: Maybe<string> =
      payload?.text ??
      payload?.transcription ??
      payload?.results?.[0]?.text ??
      payload?.results?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript || !String(transcript).trim()) {
      throw new Error("Received an empty transcription result.");
    }

    return String(transcript).trim();
  };

  private injectTranscription = async (
    context: AudioContext,
    lineEnd: number,
    transcript: string
  ) => {
    const noteContent = await this.plugin.app.vault.read(context.noteFile);
    const insertionIndex = this.getInsertionIndex(noteContent, lineEnd + 1);
    const startMarker = `${START_MARKER_PREFIX}${context.audioFile.path}-->`;
    const endMarker = `${END_MARKER_PREFIX}${context.audioFile.path}-->`;
    const block = `\n\n${startMarker}\n**Transcription:**\n\n${transcript}\n${endMarker}\n`;

    const existingStartIndex = noteContent.indexOf(startMarker);

    if (existingStartIndex >= 0) {
      const existingEndIndex = noteContent.indexOf(endMarker, existingStartIndex);

      if (existingEndIndex >= 0) {
        const afterEnd = existingEndIndex + endMarker.length;
        const remainderStart = this.skipTrailingNewlines(noteContent, afterEnd);
        const updatedContent =
          noteContent.slice(0, existingStartIndex) +
          block +
          noteContent.slice(remainderStart);

        await this.plugin.app.vault.modify(context.noteFile, updatedContent);
        return;
      }
    }

    const updatedContent =
      noteContent.slice(0, insertionIndex) +
      block +
      noteContent.slice(insertionIndex);

    await this.plugin.app.vault.modify(context.noteFile, updatedContent);
  };

  private getLineEnd = (
    embed: HTMLElement,
    noteFile: TFile
  ): number | null => {
    const raw = embed.dataset.crmAudioLineEnd ?? "";
    const parsed = Number(raw);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }

    const cache = this.plugin.app.metadataCache.getFileCache(noteFile);

    if (!cache?.embeds?.length) {
      return null;
    }

    const source = this.normalizeSourcePath(
      embed.dataset.crmAudioSource ?? this.extractEmbedSource(embed) ?? ""
    );

    const target = cache.embeds.find((entry) => {
      const normalized = this.normalizeSourcePath(entry.link ?? "");
      return normalized === source;
    });

    if (!target) {
      return null;
    }

    embed.dataset.crmAudioLineStart = String(target.position.start.line ?? "");
    embed.dataset.crmAudioLineEnd = String(target.position.end.line ?? "");

    const fallback = Number(embed.dataset.crmAudioLineEnd ?? "");

    return Number.isNaN(fallback) ? null : fallback;
  };

  private getInsertionIndex = (content: string, lineNumber: number) => {
    if (lineNumber <= 0) {
      return 0;
    }

    let offset = 0;
    let currentLine = 0;

    while (currentLine < lineNumber && offset < content.length) {
      const nextNewline = content.indexOf("\n", offset);

      if (nextNewline === -1) {
        return content.length;
      }

      offset = nextNewline + 1;
      currentLine += 1;
    }

    return offset;
  };

  private skipTrailingNewlines = (content: string, startIndex: number) => {
    let index = startIndex;

    while (index < content.length && content[index] === "\n") {
      index += 1;
    }

    return index;
  };

  private extractEmbedSource = (embed: HTMLElement) => {
    const attributes = ["src", "data-src", "data-href", "href"];

    for (const attribute of attributes) {
      const value = embed.getAttribute(attribute);

      if (value) {
        return value;
      }
    }

    const datasetSource = (embed as HTMLElement & { dataset: Record<string, string> })
      .dataset?.src;

    if (datasetSource) {
      return datasetSource;
    }

    return null;
  };

  private normalizeSourcePath = (path: string) => {
    if (!path) {
      return "";
    }

    const withoutSubpath = path.split("#")[0] ?? path;
    const withoutAlias = withoutSubpath.split("|")[0] ?? withoutSubpath;
    return withoutAlias.trim();
  };
}
