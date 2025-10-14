import React from "react";
import { createRoot, Root } from "react-dom/client";
import {
  MarkdownView,
  Notice,
  TFile,
  type Editor,
  type EditorPosition,
} from "obsidian";
import type CRM from "@/main";
import VoiceFabButton from "@/components/VoiceFabButton";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MODEL = "gpt-5-nano";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const PROCESSING_NOTICE_MS = 5_000;

const extractErrorMessage = async (response: Response) => {
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

type ResponseContent = {
  type?: string;
  text?: string;
  value?: string;
};

type ResponseOutput = {
  type?: string;
  content?: ResponseContent[];
  text?: string;
};

type ResponsePayload = {
  output_text?: string;
  output?: ResponseOutput[];
  content?: ResponseOutput[];
  data?: ResponseOutput[];
};

type RecordingContext = {
  editor: Editor;
  file: TFile;
  cursor: EditorPosition;
  view: MarkdownView;
};

export class NoteDictationManager {
  private readonly plugin: CRM;
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  private recordingContext: RecordingContext | null = null;
  private processingNotice: Notice | null = null;

  constructor(plugin: CRM) {
    this.plugin = plugin;
  }

  initialize = () => {
    if (this.container) {
      return;
    }

    const container = document.createElement("div");
    container.className = "crm-voice-fab-container";
    document.body.appendChild(container);

    this.container = container;
    this.root = createRoot(container);

    this.render();

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.render();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        this.render();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.render();
      })
    );
  };

  dispose = () => {
    this.processingNotice?.hide();
    this.processingNotice = null;

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = null;

    this.recordingContext = null;
  };

  private getActiveMarkdownView = () => {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView) ?? null;
  };

  private getApiKey = () => {
    const key = this.plugin.settings?.openAIWhisperApiKey;
    if (typeof key !== "string") {
      return "";
    }
    return key.trim();
  };

  private getSelectedModel = () => {
    const model = this.plugin.settings?.openAIModel;
    if (typeof model !== "string" || !model.trim()) {
      return DEFAULT_MODEL;
    }
    return model.trim();
  };

  private isPolishEnabled = () => {
    const flag = this.plugin.settings?.openAITranscriptionPolishEnabled;
    return flag !== false;
  };

  private render = () => {
    if (!this.root || !this.container) {
      return;
    }

    const view = this.getActiveMarkdownView();
    const visible = Boolean(view);
    const apiKey = this.getApiKey();

    const tooltip = !apiKey
      ? "Set your OpenAI API key in the CRM settings."
      : undefined;

    this.container.style.display = visible ? "block" : "none";

    this.root.render(
      <React.StrictMode>
        <VoiceFabButton
          visible={visible}
          disabled={!apiKey}
          tooltip={tooltip}
          onStart={this.handleStart}
          onAbort={this.handleAbort}
          onSubmit={this.handleSubmit}
        />
      </React.StrictMode>
    );
  };

  private handleStart = async () => {
    const view = this.getActiveMarkdownView();
    if (!view) {
      throw new Error("Open a markdown note to record a voice snippet.");
    }

    const editor = view.editor;
    const file = view.file;

    if (!editor || !file) {
      throw new Error("Unable to access the active note editor.");
    }

    this.recordingContext = {
      editor,
      file,
      view,
      cursor: editor.getCursor(),
    };
  };

  private handleAbort = () => {
    this.recordingContext = null;
  };

  private handleSubmit = async (audio: Blob) => {
    const context = this.recordingContext;
    const apiKey = this.getApiKey();

    if (!context) {
      throw new Error("The editor context is no longer available.");
    }

    if (!apiKey) {
      throw new Error("Set your OpenAI API key in the CRM settings.");
    }

    this.processingNotice?.hide();
    this.processingNotice = new Notice("Processing voice note…", PROCESSING_NOTICE_MS);

    try {
      const transcript = await this.requestTranscription(audio, apiKey);
      const shouldPolish = this.isPolishEnabled();
      const content = shouldPolish
        ? await this.requestCompletion(transcript, apiKey)
        : transcript;
      this.insertText(content, context);
      new Notice("Voice note inserted into the document.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process voice note.";
      console.error("CRM: failed to process voice note", error);
      new Notice(`Voice note failed: ${message}`);
      throw new Error(message);
    } finally {
      this.processingNotice?.hide();
      this.processingNotice = null;
      this.recordingContext = null;
    }
  };

  private requestTranscription = async (audio: Blob, apiKey: string) => {
    const formData = new FormData();
    formData.append("model", TRANSCRIPTION_MODEL);
    formData.append("file", audio, "voice-note.webm");

    const response = await fetch(TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "Transcription request failed.");
    }

    const payload = (await response.json()) as { text?: string };
    const transcript = typeof payload.text === "string" ? payload.text.trim() : "";

    if (!transcript) {
      throw new Error("Received an empty transcription result.");
    }

    return transcript;
  };

  private requestCompletion = async (transcript: string, apiKey: string) => {
    const model = this.getSelectedModel();
    const prompt = `You are an expert transcription curator.\nTake this raw voice transcript and polish it from the classic vocalization issues.\nMake the minimum intervention possible.\n\nTRANSCRIPT:\n${transcript}`;

    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "Model request failed.");
    }

    const payload = (await response.json()) as ResponsePayload;
    const text = this.extractText(payload).trim();

    if (!text) {
      throw new Error("The model did not return any text.");
    }

    return text;
  };

  private extractText = (payload: ResponsePayload): string => {
    if (payload.output_text && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    const collections = [payload.output, payload.content, payload.data];

    for (const collection of collections) {
      if (!Array.isArray(collection)) {
        continue;
      }

      for (const item of collection) {
        if (!item) {
          continue;
        }

        if (typeof item.text === "string" && item.text.trim()) {
          return item.text.trim();
        }

        if (!Array.isArray(item.content)) {
          continue;
        }

        for (const content of item.content) {
          const candidate =
            (typeof content?.text === "string" && content.text.trim()) ||
            (typeof content?.value === "string" && content.value.trim());
          if (candidate) {
            return candidate.trim();
          }
        }
      }
    }

    return "";
  };

  private insertText = (text: string, context: RecordingContext) => {
    const { editor, cursor, view, file } = context;

    if (!editor || !view || !file) {
      throw new Error("Unable to insert text into the active editor.");
    }

    const sanitized = text.replace(/\s+$/, "");
    const insertion = sanitized.endsWith("\n") ? sanitized : `${sanitized}\n`;

    editor.replaceRange(insertion, cursor, cursor);

    const lines = insertion.split("\n");
    const lineDelta = lines.length - 1;
    const lastLine = lines[lines.length - 1] ?? "";
    const finalCursor: EditorPosition = {
      line: cursor.line + lineDelta,
      ch: lineDelta === 0 ? cursor.ch + lastLine.length : lastLine.length,
    };

    editor.setCursor(finalCursor);

    try {
      if (view.leaf) {
        this.plugin.app.workspace.setActiveLeaf(view.leaf, { focus: true });
      }
    } catch (error) {
      console.error("CRM: failed to focus active leaf", error);
    }
  };
}

export default NoteDictationManager;
