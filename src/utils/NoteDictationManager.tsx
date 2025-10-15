import React from "react";
import { createRoot, Root } from "react-dom/client";
import {
  MarkdownView,
  Notice,
  Platform,
  TFile,
  setIcon,
  type Editor,
  type EditorPosition,
} from "obsidian";
import type CRM from "@/main";
import VoiceFabButton from "@/components/VoiceFabButton";
import NoteDictationController, {
  type DictationState,
} from "@/utils/NoteDictationController";
import VoiceTranscriptionService from "@/utils/VoiceTranscriptionService";

const PROCESSING_NOTICE_MS = 5_000;

type RecordingContext = {
  editor: Editor;
  file: TFile;
  cursor: EditorPosition;
  view: MarkdownView;
};

export class NoteDictationManager {
  private readonly plugin: CRM;
  private readonly transcriptionService: VoiceTranscriptionService;
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  private recordingContext: RecordingContext | null = null;
  private processingNotice: Notice | null = null;
  private controller: NoteDictationController | null = null;
  private unsubscribeController: (() => void) | null = null;
  private toolbarButton: HTMLButtonElement | null = null;
  private toolbarIcon: HTMLElement | null = null;
  private toolbarVisible = false;
  private toolbarDisabled = false;
  private toolbarTooltip: string | undefined;
  private toolbarRetryTimeout: number | null = null;

  constructor(plugin: CRM) {
    this.plugin = plugin;
    this.transcriptionService = new VoiceTranscriptionService(plugin);
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

    this.unsubscribeController?.();
    this.unsubscribeController = null;
    this.controller?.reset();
    this.controller = null;

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = null;

    this.destroyToolbarButton();
    this.recordingContext = null;
  };

  private ensureController = () => {
    if (!this.controller) {
      this.controller = new NoteDictationController({
        onStart: this.handleStart,
        onAbort: this.handleAbort,
        onSubmit: this.handleSubmit,
      });
      this.unsubscribeController = this.controller.subscribe((state) => {
        this.updateToolbarState(state);
      });
    }
    return this.controller;
  };

  private getActiveMarkdownView = () => {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView) ?? null;
  };

  private getApiKey = () => {
    return this.transcriptionService.getApiKey();
  };

  private render = () => {
    if (!this.root || !this.container) {
      return;
    }

    const controller = this.ensureController();
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
          controller={controller}
          visible={visible}
          disabled={!apiKey}
          tooltip={tooltip}
        />
      </React.StrictMode>
    );

    this.toolbarVisible = visible;
    this.toolbarDisabled = !apiKey;
    this.toolbarTooltip = tooltip;
    this.updateToolbarButton();
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
      const content = await this.transcriptionService.process(audio);
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

  private handleToolbarClick = () => {
    const controller = this.controller;
    if (!controller || !this.toolbarVisible) {
      return;
    }

    if (this.toolbarDisabled) {
      if (this.toolbarTooltip) {
        new Notice(this.toolbarTooltip);
      }
      return;
    }

    const state = controller.getState();

    if (state.status === "recording") {
      controller.stop();
      return;
    }

    if (state.status === "processing") {
      return;
    }

    void controller.start();
  };

  private updateToolbarButton = () => {
    if (!Platform.isMobileApp || !this.toolbarVisible) {
      this.destroyToolbarButton();
      return;
    }

    const container = this.findToolbarContainer();
    if (!container) {
      this.scheduleToolbarRetry();
      return;
    }

    if (!this.toolbarButton || !this.toolbarButton.isConnected) {
      this.createToolbarButton(container);
    }

    const label = this.toolbarTooltip ?? "Record voice note";
    if (this.toolbarButton) {
      this.toolbarButton.setAttribute("title", label);
      this.toolbarButton.setAttribute("aria-label", label);
      this.toolbarButton.disabled = this.toolbarDisabled;
    }

    if (this.controller) {
      this.updateToolbarState(this.controller.getState());
    }
  };

  private scheduleToolbarRetry = () => {
    if (this.toolbarRetryTimeout !== null) {
      return;
    }
    this.toolbarRetryTimeout = window.setTimeout(() => {
      this.toolbarRetryTimeout = null;
      this.updateToolbarButton();
    }, 250);
  };

  private createToolbarButton = (container: HTMLElement) => {
    this.destroyToolbarButton();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "crm-dictation-toolbar-button";
    button.addEventListener("click", this.handleToolbarClick);

    const icon = document.createElement("span");
    icon.className = "crm-dictation-toolbar-button__icon";
    button.appendChild(icon);
    setIcon(icon, "mic");

    container.appendChild(button);

    this.toolbarButton = button;
    this.toolbarIcon = icon;
  };

  private destroyToolbarButton = () => {
    if (this.toolbarRetryTimeout !== null) {
      window.clearTimeout(this.toolbarRetryTimeout);
      this.toolbarRetryTimeout = null;
    }

    if (this.toolbarButton) {
      this.toolbarButton.removeEventListener("click", this.handleToolbarClick);
      this.toolbarButton.remove();
      this.toolbarButton = null;
    }

    this.toolbarIcon = null;
  };

  private findToolbarContainer = () => {
    const selectors = [
      ".mod-mobile .mobile-toolbar-options",
      ".mod-mobile .mobile-toolbar",
      ".mod-mobile .cm-mobile-toolbar",
    ];

    for (const selector of selectors) {
      const element = document.body.querySelector(selector);
      if (element instanceof HTMLElement) {
        return element;
      }
    }

    return null;
  };

  private updateToolbarState = (state: DictationState) => {
    const button = this.toolbarButton;
    if (!button) {
      return;
    }

    const isProcessing = state.status === "processing";
    const isRecording = state.status === "recording";
    const isError = state.status === "error";
    const isSuccess = state.status === "success";

    button.classList.toggle("crm-dictation-toolbar-button--recording", isRecording);
    button.classList.toggle("crm-dictation-toolbar-button--processing", isProcessing);
    button.classList.toggle("crm-dictation-toolbar-button--error", isError);
    button.classList.toggle("crm-dictation-toolbar-button--success", isSuccess);
    button.setAttribute("aria-pressed", isRecording ? "true" : "false");
    button.disabled = this.toolbarDisabled || isProcessing;

    const icon = this.toolbarIcon;
    if (icon) {
      const iconName = this.resolveIconName(state.status);
      setIcon(icon, iconName);
      if (isProcessing) {
        icon.classList.add("crm-voice-fab-icon--spin");
      } else {
        icon.classList.remove("crm-voice-fab-icon--spin");
      }
    }
  };

  private resolveIconName = (status: DictationState["status"]) => {
    if (status === "recording") {
      return "waveform";
    }
    if (status === "processing") {
      return "loader-2";
    }
    if (status === "success") {
      return "check";
    }
    if (status === "error") {
      return "alert-circle";
    }
    return "mic";
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
