import type CRM from "@/main";
import {
  MarkdownView,
  Notice,
  TFile,
} from "obsidian";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const START_MARKER_PREFIX = "<!--crm-transcription:";
const END_MARKER_PREFIX = "<!--/crm-transcription:";

type AudioMenuContext = {
  embed: HTMLElement;
  noteFile: TFile;
  sourcePath: string;
  lineEnd: number;
  timestamp: number;
};

type Maybe<T> = T | null | undefined;

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

const getMimeFromExtension = (extension: Maybe<string>) => {
  if (!extension) {
    return MIME_FALLBACK;
  }

  const normalized = extension.replace(/^\./, "").toLowerCase();
  return EXTENSION_TO_MIME[normalized] ?? MIME_FALLBACK;
};

export class AudioTranscriptionManager {
  private readonly plugin: CRM;

  private pendingContext: AudioMenuContext | null = null;

  private pendingTimeout: number | null = null;

  private observer: MutationObserver | null = null;

  private readonly activeTranscriptions = new Set<string>();

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    this.plugin.registerMarkdownPostProcessor((el, ctx) => {
      const embedElements = el.querySelectorAll<HTMLElement>(".internal-embed");

      embedElements.forEach((embed) => {
        const audio = embed.querySelector("audio");
        if (!audio) {
          return;
        }

        const section = ctx.getSectionInfo(embed);
        if (!section) {
          return;
        }

        embed.dataset.crmAudioLineStart = String(section.lineStart ?? "");
        embed.dataset.crmAudioLineEnd = String(section.lineEnd ?? "");

        const rawSource =
          embed.getAttribute("src") ??
          (embed as HTMLElement & { dataset: { src?: string } }).dataset?.src ??
          embed.getAttribute("data-src") ??
          embed.getAttribute("data-href") ??
          "";

        if (rawSource) {
          embed.dataset.crmAudioSource = rawSource;
        }
      });
    });

    const handlePotentialMenuTrigger = (event: Event) => {
      const context = this.resolveAudioContext(event);

      if (!context) {
        return;
      }

      this.pendingContext = context;

      if (this.pendingTimeout !== null) {
        window.clearTimeout(this.pendingTimeout);
      }

      this.pendingTimeout = window.setTimeout(() => {
        if (!this.pendingContext) {
          return;
        }

        const hasExpired = Date.now() - this.pendingContext.timestamp > 750;
        if (hasExpired) {
          this.pendingContext = null;
        }
      }, 1000);
    };

    this.plugin.registerDomEvent(document, "contextmenu", handlePotentialMenuTrigger);

    this.plugin.registerDomEvent(document, "pointerdown", (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (!event.target.closest(".internal-embed")) {
        return;
      }

      handlePotentialMenuTrigger(event);
    });

    this.setupMenuObserver();
    this.plugin.register(() => this.dispose());
  };

  dispose = () => {
    this.pendingContext = null;

    if (this.pendingTimeout !== null) {
      window.clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  };

  private setupMenuObserver = () => {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    const target = document.body;
    if (!target) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.pendingContext) {
        return;
      }

      const now = Date.now();
      if (now - this.pendingContext.timestamp > 750) {
        this.pendingContext = null;
        return;
      }

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.classList.contains("menu")) {
            this.injectMenuItem(node, this.pendingContext);
            return;
          }

          const menu = node.querySelector<HTMLElement>(".menu");
          if (menu) {
            this.injectMenuItem(menu, this.pendingContext);
          }
        });
      });
    });

    this.observer.observe(target, { childList: true, subtree: true });
  };

  private injectMenuItem = (menu: HTMLElement, context: AudioMenuContext) => {
    if (!context.embed.isConnected) {
      this.pendingContext = null;
      return;
    }

    if (menu.dataset.crmAudioTranscribeInjected === "true") {
      return;
    }

    menu.dataset.crmAudioTranscribeInjected = "true";

    const item = menu.createDiv({ cls: "menu-item crm-audio-transcribe-item" });
    const icon = item.createDiv({ cls: "menu-item-icon" });
    icon.setText("📝");

    item.createDiv({ cls: "menu-item-title" }).setText("Transcribe audio");

    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      menu.remove();
      this.pendingContext = null;

      void this.handleTranscription(context);
    });

    menu.appendChild(item);
  };

  private resolveAudioContext = (event: Event): AudioMenuContext | null => {
    const audio = this.getAudioElementFromEvent(event);

    if (!audio) {
      return null;
    }

    const embed = audio.closest<HTMLElement>(".internal-embed");

    if (!embed) {
      return null;
    }

    const sourcePath = embed.dataset.crmAudioSource;

    if (!sourcePath) {
      return null;
    }

    const leaf = this.plugin.app
      .getLeavesOfType("markdown")
      .find((candidate) => {
        const view = candidate.view as MarkdownView;
        return Boolean(view?.containerEl?.contains(embed));
      });

    const noteFile = (leaf?.view as MarkdownView | undefined)?.file ?? null;

    if (!noteFile) {
      return null;
    }

    const lineEnd = Number(embed.dataset.crmAudioLineEnd ?? "");

    if (Number.isNaN(lineEnd)) {
      this.annotateEmbedFromCache(embed, noteFile, sourcePath);
      const fallbackLineEnd = Number(embed.dataset.crmAudioLineEnd ?? "");

      if (Number.isNaN(fallbackLineEnd)) {
        return null;
      }

      return {
        embed,
        noteFile,
        sourcePath,
        lineEnd: fallbackLineEnd,
        timestamp: Date.now(),
      };
    }

    return {
      embed,
      noteFile,
      sourcePath,
      lineEnd,
      timestamp: Date.now(),
    };
  };

  private annotateEmbedFromCache = (
    embed: HTMLElement,
    noteFile: TFile,
    sourcePath: string
  ) => {
    const cache = this.plugin.app.metadataCache.getFileCache(noteFile);

    if (!cache?.embeds?.length) {
      return;
    }

    const normalizedSource = this.normalizeSourcePath(sourcePath);

    const targetEmbed = cache.embeds.find((entry) => {
      const normalizedEntry = this.normalizeSourcePath(entry.link ?? "");
      return normalizedEntry === normalizedSource;
    });

    if (!targetEmbed) {
      return;
    }

    const { position } = targetEmbed;
    embed.dataset.crmAudioLineStart = String(position.start.line ?? "");
    embed.dataset.crmAudioLineEnd = String(position.end.line ?? "");
  };

  private normalizeSourcePath = (path: string) => {
    const withoutSubpath = path.split("#")[0] ?? path;
    const withoutAlias = withoutSubpath.split("|")[0] ?? withoutSubpath;
    return withoutAlias.trim();
  };

  private getAudioElementFromEvent = (event: Event): HTMLMediaElement | null => {
    if (!event) {
      return null;
    }

    if (event.target instanceof HTMLMediaElement) {
      return event.target;
    }

    const path = (event.composedPath?.() ?? []) as unknown[];

    for (const element of path) {
      if (element instanceof HTMLMediaElement) {
        return element;
      }

      if (element instanceof HTMLElement) {
        const audio = element.querySelector<HTMLMediaElement>("audio");
        if (audio) {
          return audio;
        }
      }
    }

    if (event.target instanceof HTMLElement) {
      const candidate = event.target.closest(".internal-embed");
      const audio = candidate?.querySelector<HTMLMediaElement>("audio") ?? null;
      if (audio) {
        return audio;
      }
    }

    return null;
  };

  private handleTranscription = async (context: AudioMenuContext) => {
    const apiKey = (this.plugin as any).settings?.openAIWhisperApiKey?.trim?.();

    if (!apiKey) {
      new Notice("Set your OpenAI Whisper API key in the CRM settings before transcribing.");
      return;
    }

    const { noteFile, sourcePath } = context;
    const linkpath = this.normalizeSourcePath(sourcePath);
    const audioFile = this.plugin.app.metadataCache.getFirstLinkpathDest(
      linkpath,
      noteFile.path
    );

    if (!audioFile) {
      new Notice("Unable to locate the audio file in the vault.");
      return;
    }

    const transcriptionKey = `${noteFile.path}::${audioFile.path}`;

    if (this.activeTranscriptions.has(transcriptionKey)) {
      new Notice("A transcription is already in progress for this audio file.");
      return;
    }

    this.activeTranscriptions.add(transcriptionKey);

    new Notice("Transcribing audio…");

    try {
      const transcript = await this.createTranscription(apiKey, audioFile);
      await this.injectTranscription(context, audioFile, transcript);
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
    const binary = await this.plugin.app.vault.adapter.readBinary(file.path);
    const buffer = binary instanceof ArrayBuffer ? binary : binary.buffer;
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
      } catch (error) {
        console.warn("CRM: unable to parse transcription error payload", error);
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
    context: AudioMenuContext,
    audioFile: TFile,
    transcript: string
  ) => {
    const noteContent = await this.plugin.app.vault.read(context.noteFile);

    const insertionIndex = this.getInsertionIndex(noteContent, context.lineEnd + 1);
    const startMarker = `${START_MARKER_PREFIX}${audioFile.path}-->`;
    const endMarker = `${END_MARKER_PREFIX}${audioFile.path}-->`;
    const block = `\n\n${startMarker}\n**Transcription:**\n\n${transcript}\n${endMarker}\n`;

    const existingStartIndex = noteContent.indexOf(startMarker, insertionIndex);

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
}
