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
import type Mondo from "@/main";
import VoiceFabButton from "@/components/VoiceFabButton";
import NoteDictationController, {
  type DictationState,
} from "@/utils/NoteDictationController";
import VoiceTranscriptionService from "@/utils/VoiceTranscriptionService";
import TranscriptionOverlay from "@/utils/TranscriptionOverlay";
import {
  MONDO_DICTATION_ICON_ID,
  registerDictationIcon,
} from "@/utils/registerDictationIcon";

const PROCESSING_NOTICE_MS = 5_000;
const WHISPER_REALTIME_RATIO = 0.3;
const MIN_TRANSCRIPTION_SECONDS = 5;

type RecordingContext = {
  editor: Editor;
  file: TFile;
  cursor: EditorPosition;
  view: MarkdownView;
};

export class NoteDictationManager {
  private readonly plugin: Mondo;
  private readonly transcriptionService: VoiceTranscriptionService;
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  private recordingContext: RecordingContext | null = null;
  private processingNotice: Notice | null = null;
  private controller: NoteDictationController | null = null;
  private unsubscribeController: (() => void) | null = null;
  private toolbarButton: HTMLButtonElement | null = null;
  private toolbarIcon: HTMLElement | null = null;
  private toolbarLabel: HTMLElement | null = null;
  private toolbarVisible = false;
  private toolbarDisabled = false;
  private toolbarTooltip: string | undefined;
  private toolbarRetryTimeout: number | null = null;

  private transcriptionOverlay: TranscriptionOverlay | null = null;
  private overlayContainer: HTMLElement | null = null;
  private overlayRecordingTimer: number | null = null;
  private overlayProcessingTimer: number | null = null;
  private overlayRecordingStartedAt: number | null = null;
  private overlayProcessingStartedAt: number | null = null;
  private overlayRecordingElapsedEl: HTMLElement | null = null;
  private overlayProcessingEstimateEl: HTMLElement | null = null;
  private processingEstimateSeconds: number | null = null;
  private lastRecordingDurationMs: number | null = null;
  private transcriptionAbortController: AbortController | null = null;
  private lastDictationStatus: DictationState["status"] = "idle";
  private cancellationNotice: Notice | null = null;

  constructor(plugin: Mondo) {
    this.plugin = plugin;
    this.transcriptionService = new VoiceTranscriptionService(plugin);
    registerDictationIcon();
  }

  initialize = () => {
    if (this.container) {
      return;
    }

    const container = document.createElement("div");
    container.className = "mondo-voice-fab-container";
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
    this.cancellationNotice?.hide();
    this.cancellationNotice = null;
    this.transcriptionAbortController?.abort();
    this.transcriptionAbortController = null;
    this.teardownTranscriptionOverlay();
    this.transcriptionOverlay = null;
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
        this.updateTranscriptionOverlay(state);
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
      ? "Set your OpenAI API key in the Mondo settings."
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
    this.teardownTranscriptionOverlay();
  };

  private handleSubmit = async (audio: Blob) => {
    const context = this.recordingContext;
    const apiKey = this.getApiKey();

    if (!context) {
      // Treat missing editor context as a user-initiated cancel to avoid noisy errors
      // downstream in the controller. Use a DOMException with name "AbortError"
      // so it can be identified as a graceful cancellation.
      throw new DOMException("Transcription canceled.", "AbortError");
    }

    if (!apiKey) {
      throw new Error("Set your OpenAI API key in the Mondo settings.");
    }

    this.processingNotice?.hide();
    this.processingNotice = new Notice(
      "Processing voice note…",
      PROCESSING_NOTICE_MS
    );

    const abortController = new AbortController();
    this.transcriptionAbortController = abortController;

    try {
      const content = await this.transcriptionService.process(audio, {
        signal: abortController.signal,
      });
      this.insertText(content, context);
      new Notice("Voice note inserted into the document.");
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Failed to process voice note.");
      const isAbortError =
        normalizedError.name === "AbortError" ||
        (error instanceof DOMException && error.name === "AbortError");

      if (isAbortError) {
        console.info("Mondo: voice transcription aborted by user.");
        throw new Error("Transcription canceled.");
      }

      const message =
        normalizedError.message?.trim() || "Failed to process voice note.";
      console.error("Mondo: failed to process voice note", error);
      new Notice(`Voice note failed: ${message}`);
      throw new Error(message);
    } finally {
      this.processingNotice?.hide();
      this.processingNotice = null;
      this.recordingContext = null;
      this.transcriptionAbortController = null;
    }
  };

  private handleToolbarClick = () => {
    void this.toggleRecording({ showDisabledNotice: false });
  };

  private resolveController = (showDisabledNotice: boolean) => {
    this.render();

    const controller = this.ensureController();

    if (!this.toolbarVisible) {
      if (showDisabledNotice) {
        new Notice("Open a markdown note to record a voice snippet.");
      }
      return null;
    }

    if (this.toolbarDisabled) {
      if (showDisabledNotice && this.toolbarTooltip) {
        new Notice(this.toolbarTooltip);
      }
      return null;
    }

    return controller;
  };

  private startWithController = async (
    controller: NoteDictationController,
    showDisabledNotice: boolean
  ) => {
    const state = controller.getState();

    if (state.status === "recording") {
      if (showDisabledNotice) {
        new Notice("Dictation already in progress.");
      }
      return "recording" as const;
    }

    if (state.status === "processing") {
      if (showDisabledNotice) {
        new Notice(
          "Please wait for the current dictation to finish processing."
        );
      }
      return "processing" as const;
    }

    await controller.start();
    return "started" as const;
  };

  startDictation = async ({
    showDisabledNotice = true,
  }: { showDisabledNotice?: boolean } = {}) => {
    const controller = this.resolveController(showDisabledNotice);
    if (!controller) {
      return "unavailable" as const;
    }

    return this.startWithController(controller, showDisabledNotice);
  };

  stopDictation = ({
    showDisabledNotice = true,
  }: { showDisabledNotice?: boolean } = {}) => {
    const controller = this.resolveController(showDisabledNotice);
    if (!controller) {
      return "unavailable" as const;
    }

    const state = controller.getState();

    if (state.status === "recording") {
      controller.stop();
      return "stopped" as const;
    }

    if (showDisabledNotice) {
      if (state.status === "processing") {
        new Notice(
          "Please wait for the current dictation to finish processing."
        );
      } else if (state.status === "idle") {
        new Notice("No active dictation to stop.");
      }
    }

    return state.status;
  };

  getDictationStatus = () => {
    return this.controller?.getState().status ?? "idle";
  };

  toggleRecording = async ({
    showDisabledNotice = true,
  }: { showDisabledNotice?: boolean } = {}) => {
    const controller = this.resolveController(showDisabledNotice);
    if (!controller) {
      return "unavailable" as const;
    }

    const state = controller.getState();

    if (state.status === "recording") {
      controller.stop();
      return "stopped" as const;
    }

    return this.startWithController(controller, showDisabledNotice);
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
    button.className = "mondo-mobile-toolbar-button mondo-dictation-toolbar-button";
    button.addEventListener("click", this.handleToolbarClick);

    const icon = document.createElement("span");
    icon.className = "mondo-mobile-toolbar-button__icon";
    button.appendChild(icon);
    setIcon(icon, MONDO_DICTATION_ICON_ID);

    const label = document.createElement("span");
    label.className = "mondo-mobile-toolbar-button__label";
    label.textContent = "Start dictation";
    button.appendChild(label);

    if (container.firstChild) {
      container.insertBefore(button, container.firstChild);
    } else {
      container.appendChild(button);
    }

    this.toolbarButton = button;
    this.toolbarIcon = icon;
    this.toolbarLabel = label;

    if (this.controller) {
      this.updateToolbarState(this.controller.getState());
    }
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
    this.toolbarLabel = null;
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

    button.classList.toggle(
      "mondo-dictation-toolbar-button--recording",
      isRecording
    );
    button.classList.toggle(
      "mondo-dictation-toolbar-button--processing",
      isProcessing
    );
    button.classList.toggle("mondo-dictation-toolbar-button--error", isError);
    button.classList.toggle("mondo-dictation-toolbar-button--success", isSuccess);
    button.setAttribute("aria-pressed", isRecording ? "true" : "false");
    button.disabled = this.toolbarDisabled || isProcessing;

    const icon = this.toolbarIcon;
    if (icon) {
      const iconName = this.resolveIconName(state.status);
      setIcon(icon, iconName);
      if (isProcessing) {
        icon.classList.add("mondo-voice-fab-icon--spin");
      } else {
        icon.classList.remove("mondo-voice-fab-icon--spin");
      }
    }

    this.applyToolbarLabels(state);
  };

  private applyToolbarLabels = (state: DictationState) => {
    const button = this.toolbarButton;
    if (!button) {
      return;
    }

    const tooltip = this.toolbarTooltip;
    const accessibleLabel = this.getToolbarAccessibleLabel(state);
    const title = tooltip ?? accessibleLabel;
    button.setAttribute("aria-label", accessibleLabel);
    button.setAttribute("title", title);

    if (this.toolbarLabel) {
      this.toolbarLabel.textContent = this.getToolbarActionLabel(state);
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
    return MONDO_DICTATION_ICON_ID;
  };

  activateMobileToolbar = () => {
    if (!Platform.isMobileApp) {
      return;
    }

    this.render();
  };

  private getToolbarAccessibleLabel = (state: DictationState) => {
    if (this.toolbarDisabled && this.toolbarTooltip) {
      return "Start dictation";
    }

    if (state.status === "recording") {
      return "Stop dictation";
    }
    if (state.status === "processing") {
      return "Processing dictation";
    }
    if (state.status === "success") {
      return "Dictation inserted";
    }
    if (state.status === "error") {
      return "Retry dictation";
    }
    return "Start dictation";
  };

  private getToolbarActionLabel = (state: DictationState) => {
    if (state.status === "recording") {
      return "Stop";
    }
    if (state.status === "processing") {
      return "Processing";
    }
    if (state.status === "success") {
      return "Done";
    }
    if (state.status === "error") {
      return "Retry";
    }
    return "Start dictation";
  };

  private ensureOverlay = () => {
    if (!this.transcriptionOverlay) {
      this.transcriptionOverlay = new TranscriptionOverlay();
    }
    return this.transcriptionOverlay;
  };

  private mountOverlayContainer = () => {
    const overlay = this.ensureOverlay();
    const container = overlay.ensureContainer({
      className: "mondo-transcription-stage",
    });
    container.replaceChildren();
    this.overlayContainer = container;
    return container;
  };

  private clearRecordingTimer = () => {
    if (this.overlayRecordingTimer !== null) {
      window.clearInterval(this.overlayRecordingTimer);
      this.overlayRecordingTimer = null;
    }
  };

  private clearProcessingTimer = () => {
    if (this.overlayProcessingTimer !== null) {
      window.clearInterval(this.overlayProcessingTimer);
      this.overlayProcessingTimer = null;
    }
  };

  private formatElapsedDuration = (elapsedMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${seconds}s`;
  };

  private formatDuration = (totalSeconds: number) => {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const segments: string[] = [];

    if (hours > 0) {
      segments.push(`${hours}h`);
    }

    if (minutes > 0) {
      segments.push(`${minutes}m`);
    }

    if (hours === 0 && (minutes === 0 || remainingSeconds > 0)) {
      segments.push(`${remainingSeconds}s`);
    }

    if (segments.length === 0) {
      return "0s";
    }

    return segments.join(" ");
  };

  private refreshRecordingTimer = () => {
    if (!this.overlayRecordingElapsedEl || !this.overlayRecordingStartedAt) {
      return;
    }

    const elapsed = Date.now() - this.overlayRecordingStartedAt;
    this.overlayRecordingElapsedEl.setText(this.formatElapsedDuration(elapsed));
  };

  private estimateProcessingSeconds = () => {
    if (this.lastRecordingDurationMs == null) {
      return null;
    }

    const durationSeconds = Math.max(
      1,
      Math.round(this.lastRecordingDurationMs / 1000)
    );
    const estimatedSeconds = Math.max(
      MIN_TRANSCRIPTION_SECONDS,
      Math.round(durationSeconds * WHISPER_REALTIME_RATIO)
    );

    return estimatedSeconds;
  };

  private refreshProcessingEstimate = () => {
    if (!this.overlayProcessingEstimateEl) {
      return;
    }

    const total = this.processingEstimateSeconds;

    if (total == null) {
      this.overlayProcessingEstimateEl.setText("Estimating remaining time…");
      return;
    }

    if (!this.overlayProcessingStartedAt) {
      this.overlayProcessingStartedAt = Date.now();
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - this.overlayProcessingStartedAt) / 1000)
    );
    const remaining = Math.max(0, total - elapsedSeconds);

    if (remaining > 0) {
      this.overlayProcessingEstimateEl.setText(
        `≈${this.formatDuration(remaining)} remaining`
      );
      return;
    }

    this.overlayProcessingEstimateEl.setText("Finalizing transcription…");
  };

  private beginRecordingOverlay = () => {
    this.clearProcessingTimer();
    this.processingEstimateSeconds = null;
    this.overlayProcessingEstimateEl = null;
    this.overlayProcessingStartedAt = null;

    const container = this.mountOverlayContainer();
    const card = container.createDiv({
      cls: "mondo-transcription-stage__card",
    });

    card.createDiv({
      cls: "mondo-transcription-stage__message",
      text: "Speak naturally",
    });

    const timerEl = card.createDiv({
      cls: "mondo-transcription-stage__timer",
      text: this.formatElapsedDuration(0),
    });
    this.overlayRecordingElapsedEl = timerEl;

    card.createDiv({
      cls: "mondo-transcription-stage__hint",
      text: "Tap when you’re ready to transcribe.",
    });

    const actions = card.createDiv({
      cls: "mondo-transcription-stage__actions",
    });

    const startButton = actions.createEl("button", {
      cls: "mondo-transcription-stage__button mondo-transcription-stage__button--primary mod-cta",
      text: "Start Transcription",
    });
    startButton.type = "button";
    startButton.addEventListener("click", () => {
      if (startButton.disabled) {
        return;
      }
      startButton.disabled = true;
      startButton.classList.add("mondo-transcription-stage__button--pending");
      startButton.textContent = "Starting…";
      this.startTranscriptionFromOverlay();
    });

    const cancelButton = actions.createEl("button", {
      cls: "mondo-transcription-stage__button mondo-transcription-stage__button--secondary",
      text: "Cancel",
    });
    cancelButton.type = "button";
    cancelButton.addEventListener("click", this.cancelDictationFlow);

    const overlay = this.ensureOverlay();
    overlay.setDismissHandler(() => {
      this.cancelDictationFlow();
    });
    void overlay.acquireWakeLock();

    this.clearRecordingTimer();
    this.overlayRecordingTimer = window.setInterval(
      this.refreshRecordingTimer,
      1000
    );
    this.refreshRecordingTimer();
  };

  private beginProcessingOverlay = () => {
    this.clearRecordingTimer();
    this.overlayRecordingElapsedEl = null;

    const container = this.mountOverlayContainer();
    const card = container.createDiv({
      cls: "mondo-transcription-stage__card mondo-transcription-stage__card--processing",
    });

    card.createDiv({
      cls: "mondo-transcription-stage__message",
      text: "Transcribing your note…",
    });

    const estimateEl = card.createDiv({
      cls: "mondo-transcription-stage__estimate",
    });
    this.overlayProcessingEstimateEl = estimateEl;

    const actions = card.createDiv({
      cls: "mondo-transcription-stage__actions mondo-transcription-stage__actions--inline",
    });

    const cancelButton = actions.createEl("button", {
      cls: "mondo-transcription-stage__button mondo-transcription-stage__button--secondary",
      text: "Cancel",
    });
    cancelButton.type = "button";
    cancelButton.addEventListener("click", this.cancelDictationFlow);

    const overlay = this.ensureOverlay();
    overlay.setDismissHandler(() => {
      this.cancelDictationFlow();
    });
    void overlay.acquireWakeLock();

    this.processingEstimateSeconds = this.estimateProcessingSeconds();
    this.overlayProcessingStartedAt = Date.now();
    this.refreshProcessingEstimate();
    this.clearProcessingTimer();
    this.overlayProcessingTimer = window.setInterval(
      this.refreshProcessingEstimate,
      1000
    );
  };

  private startTranscriptionFromOverlay = () => {
    const controller = this.controller;
    if (!controller) {
      return;
    }

    const state = controller.getState();
    if (state.status !== "recording") {
      return;
    }

    controller.stop();
  };

  private cancelDictationFlow = () => {
    const controller = this.controller;

    if (!controller) {
      this.teardownTranscriptionOverlay();
      return;
    }

    const state = controller.getState();

    if (state.status === "processing") {
      this.transcriptionAbortController?.abort();
      this.cancellationNotice?.hide();
      this.cancellationNotice = new Notice("Transcription canceled.");
    }

    controller.reset();
    this.teardownTranscriptionOverlay();
  };

  private updateTranscriptionOverlay = (state: DictationState) => {
    const status = state.status;

    if (status === "recording") {
      if (this.lastDictationStatus !== "recording") {
        this.overlayRecordingStartedAt = Date.now();
        this.lastRecordingDurationMs = null;
        this.beginRecordingOverlay();
      }
      this.refreshRecordingTimer();
    } else if (status === "processing") {
      if (
        this.lastDictationStatus === "recording" &&
        this.overlayRecordingStartedAt
      ) {
        this.lastRecordingDurationMs =
          Date.now() - this.overlayRecordingStartedAt;
      }
      if (this.lastDictationStatus !== "processing") {
        this.beginProcessingOverlay();
      }
      this.refreshProcessingEstimate();
    } else {
      if (status === "success") {
        this.cancellationNotice?.hide();
        this.cancellationNotice = null;
      }
      this.teardownTranscriptionOverlay();
    }

    this.lastDictationStatus = status;
  };

  private teardownTranscriptionOverlay = () => {
    this.clearRecordingTimer();
    this.clearProcessingTimer();
    this.overlayRecordingElapsedEl = null;
    this.overlayProcessingEstimateEl = null;
    this.overlayRecordingStartedAt = null;
    this.overlayProcessingStartedAt = null;
    this.processingEstimateSeconds = null;
    this.lastRecordingDurationMs = null;
    this.overlayContainer = null;

    const overlay = this.transcriptionOverlay;

    if (!overlay) {
      return;
    }

    overlay.setDismissHandler(null);
    overlay.clear();
    void overlay.releaseWakeLock();
    overlay.destroy();
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
      console.error("Mondo: failed to focus active leaf", error);
    }
  };
}

export default NoteDictationManager;
