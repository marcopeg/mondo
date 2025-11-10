import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  type EditorPosition,
} from "obsidian";
import type Mondo from "@/main";
import editWithAIPrompt from "@/prompts/edit-with-ai.md";
import {
  EDIT_WITH_AI_MODEL_OPTIONS,
  normalizeEditWithAIModel,
} from "@/constants/openAIModels";
import { createAiProvider } from "@/ai/providerFactory";
import {
  getAiApiKey,
  getMissingAiApiKeyMessage,
  getSelectedAiProviderId,
} from "@/ai/settings";

type ConversationEntry =
  | { type: "user"; instructions: string }
  | { type: "assistant"; text: string }
  | { type: "error"; message: string };

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const buildPrompt = (instructions: string, providedText: string) =>
  editWithAIPrompt
    .replace("{{USER_INSTRUCTIONS}}", instructions)
    .replace("{{PROVIDED TEXT}}", providedText);

const copyToClipboard = async (value: string) => {
  if (!value) {
    return;
  }

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard API unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();

  const success = document.execCommand("copy");
  textarea.remove();

  if (!success) {
    throw new Error("Copy command failed");
  }
};

type SelectionRange = { from: EditorPosition; to: EditorPosition };

type EditWithAIOptions = {
  app: App;
  plugin: Mondo;
  editor: Editor;
  initialText: string;
  hasSelection: boolean;
  selectionRange: SelectionRange | null;
};

class EditWithAIModal extends Modal {
  private readonly plugin: Mondo;
  private readonly editor: Editor;
  private readonly hasSelection: boolean;
  private readonly selectionRange: SelectionRange | null;
  private readonly chatHistory: ChatMessage[] = [];
  private readonly displayHistory: ConversationEntry[] = [];
  private currentSourceText: string;

  private inputEl: HTMLTextAreaElement | null = null;
  private modelSelectEl: HTMLSelectElement | null = null;
  private sendButtonEl: HTMLButtonElement | null = null;
  private cancelButtonEl: HTMLButtonElement | null = null;
  private actionsContainerEl: HTMLDivElement | null = null;
  private acceptButtonEl: HTMLButtonElement | null = null;
  private copyButtonEl: HTMLButtonElement | null = null;
  private conversationEl: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;

  private isRequestInFlight = false;
  private lastAssistantResponse: string | null = null;
  private requestController: AbortController | null = null;
  private selectedModel: string;

  constructor(options: EditWithAIOptions) {
    super(options.app);
    this.plugin = options.plugin;
    this.editor = options.editor;
    this.hasSelection = options.hasSelection;
    this.selectionRange = options.selectionRange;
    this.currentSourceText = options.initialText;
    const storedModel = normalizeEditWithAIModel(
      (this.plugin as any).settings?.editWithAIModel
    );
    this.selectedModel = storedModel;
    if (
      typeof (this.plugin as any).settings?.editWithAIModel !== "string" ||
      (this.plugin as any).settings.editWithAIModel !== this.selectedModel
    ) {
      (this.plugin as any).settings.editWithAIModel = this.selectedModel;
      void this.plugin.saveSettings();
    }
  }

  onOpen() {
    this.titleEl.setText("Edit with AI");
    this.modalEl.addClass("mondo-edit-ai-modal");

    const container = this.contentEl.createDiv({ cls: "mondo-edit-ai" });

    const conversationContainer = container.createDiv({
      cls: "mondo-edit-ai__conversation",
    });
    this.conversationEl = conversationContainer;

    const actions = container.createDiv({ cls: "mondo-edit-ai__response-actions" });
    this.actionsContainerEl = actions;
    this.actionsContainerEl.addClass("is-hidden");
    this.acceptButtonEl = actions.createEl("button", {
      type: "button",
      cls: "mondo-edit-ai__button mondo-edit-ai__button--primary",
      text: "Accept",
    });
    this.acceptButtonEl.addEventListener("click", () => {
      this.handleAccept();
    });
    this.copyButtonEl = actions.createEl("button", {
      type: "button",
      cls: "mondo-edit-ai__button",
      text: "Copy",
    });
    this.copyButtonEl.addEventListener("click", () => {
      void this.handleCopy();
    });

    const statusEl = container.createDiv({ cls: "mondo-edit-ai__status" });
    this.statusEl = statusEl;

    const inputSection = container.createDiv({ cls: "mondo-edit-ai__input" });
    const label = inputSection.createEl("label", {
      cls: "mondo-edit-ai__label",
      text: "Instructions",
    });
    const textarea = inputSection.createEl("textarea", {
      cls: "mondo-edit-ai__textarea",
      attr: {
        placeholder: "Describe how the text should be edited…",
        rows: "4",
      },
    });
    this.inputEl = textarea;
    label.htmlFor = textarea.id = `mondo-edit-ai-input-${Date.now()}`;

    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        this.handleSend();
      }
    });

    const controlsRow = inputSection.createDiv({
      cls: "mondo-edit-ai__controls",
    });

    const modelWrapper = controlsRow.createDiv({
      cls: "mondo-edit-ai__model",
    });
    modelWrapper.createEl("label", {
      cls: "mondo-edit-ai__label",
      text: "Model",
      attr: { for: "mondo-edit-ai-model" },
    });
    const select = modelWrapper.createEl("select", {
      cls: "mondo-edit-ai__select",
      attr: { id: "mondo-edit-ai-model" },
    });
    for (const option of EDIT_WITH_AI_MODEL_OPTIONS) {
      const optionEl = select.createEl("option", {
        text: option.label,
        attr: { value: option.value },
      });
      if (option.value === this.selectedModel) {
        optionEl.selected = true;
      }
    }
    select.addEventListener("change", () => {
      const nextModel = normalizeEditWithAIModel(select.value);
      this.selectedModel = nextModel;
      (this.plugin as any).settings.editWithAIModel = this.selectedModel;
      void this.plugin.saveSettings();
    });
    this.modelSelectEl = select;

    const buttonsWrapper = controlsRow.createDiv({
      cls: "mondo-edit-ai__buttons",
    });

    const sendButton = buttonsWrapper.createEl("button", {
      type: "button",
      text: "Send",
      cls: "mondo-edit-ai__button mondo-edit-ai__button--primary",
    });
    sendButton.addEventListener("click", () => {
      this.handleSend();
    });
    this.sendButtonEl = sendButton;

    const cancelButton = buttonsWrapper.createEl("button", {
      type: "button",
      text: "Cancel",
      cls: "mondo-edit-ai__button",
    });
    cancelButton.addEventListener("click", () => {
      this.close();
    });
    this.cancelButtonEl = cancelButton;

    this.updateActionButtons();

    window.setTimeout(() => {
      this.inputEl?.focus();
    }, 0);
  }

  onClose() {
    this.requestController?.abort();
  }

  private setStatus = (message: string, type: "info" | "error" = "info") => {
    if (!this.statusEl) {
      return;
    }
    this.statusEl.setText(message);
    this.statusEl.toggleClass("mondo-edit-ai__status--error", type === "error");
  };

  private handleCopy = async () => {
    if (!this.lastAssistantResponse) {
      return;
    }

    try {
      await copyToClipboard(this.lastAssistantResponse);
      new Notice("Copied edited text.");
    } catch (error) {
      console.error("Mondo: failed to copy AI response", error);
      new Notice("Failed to copy the AI response.");
    }
  };

  private handleAccept = () => {
    if (!this.lastAssistantResponse) {
      return;
    }

    if (this.hasSelection && this.selectionRange) {
      this.editor.replaceRange(
        this.lastAssistantResponse,
        this.selectionRange.from,
        this.selectionRange.to
      );
    } else {
      this.editor.setValue(this.lastAssistantResponse);
    }

    this.close();
  };

  private updateActionButtons = () => {
    const hasResponse = Boolean(this.lastAssistantResponse);
    if (this.acceptButtonEl) {
      this.acceptButtonEl.toggleAttribute("disabled", !hasResponse || this.isRequestInFlight);
    }
    if (this.copyButtonEl) {
      this.copyButtonEl.toggleAttribute("disabled", !hasResponse || this.isRequestInFlight);
    }
    if (this.sendButtonEl) {
      this.sendButtonEl.toggleAttribute("disabled", this.isRequestInFlight);
    }
    if (this.cancelButtonEl) {
      this.cancelButtonEl.toggleAttribute("disabled", this.isRequestInFlight);
    }
    if (this.inputEl) {
      this.inputEl.toggleAttribute("disabled", this.isRequestInFlight);
    }
    if (this.modelSelectEl) {
      this.modelSelectEl.toggleAttribute("disabled", this.isRequestInFlight);
    }
  };

  private appendDisplayEntry = (entry: ConversationEntry) => {
    this.displayHistory.push(entry);
    this.renderConversation();
  };

  private renderConversation = () => {
    if (!this.conversationEl) {
      return;
    }

    this.conversationEl.empty();
    let lastAssistantMessageEl: HTMLDivElement | null = null;

    for (const entry of this.displayHistory) {
      if (entry.type === "user") {
        const el = this.conversationEl.createDiv({
          cls: "mondo-edit-ai__message mondo-edit-ai__message--user",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-label",
          text: "You",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-text",
          text: entry.instructions,
        });
      } else if (entry.type === "assistant") {
        const el = this.conversationEl.createDiv({
          cls: "mondo-edit-ai__message mondo-edit-ai__message--assistant",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-label",
          text: "AI",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-text",
          text: entry.text,
        });
        lastAssistantMessageEl = el;
      } else if (entry.type === "error") {
        const el = this.conversationEl.createDiv({
          cls: "mondo-edit-ai__message mondo-edit-ai__message--error",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-label",
          text: "Error",
        });
        el.createDiv({
          cls: "mondo-edit-ai__message-text",
          text: entry.message,
        });
      }
    }

    if (this.actionsContainerEl) {
      if (lastAssistantMessageEl) {
        lastAssistantMessageEl.appendChild(this.actionsContainerEl);
        this.actionsContainerEl.removeClass("is-hidden");
      } else {
        this.actionsContainerEl.addClass("is-hidden");
        this.conversationEl.appendChild(this.actionsContainerEl);
      }
    }

    this.conversationEl.scrollTop = this.conversationEl.scrollHeight;
  };

  private handleSend = async () => {
    if (this.isRequestInFlight) {
      return;
    }

    const instructions = this.inputEl?.value?.trim() ?? "";

    if (!instructions) {
      this.setStatus("Provide instructions before sending.", "error");
      return;
    }

    const apiKey = getAiApiKey(this.plugin.settings);

    if (!apiKey) {
      new Notice(getMissingAiApiKeyMessage(this.plugin.settings));
      return;
    }

    const providerId = getSelectedAiProviderId(this.plugin.settings);
    const provider = createAiProvider(providerId, apiKey);

    this.setStatus("Sending request…");
    this.isRequestInFlight = true;
    this.updateActionButtons();

    this.appendDisplayEntry({ type: "user", instructions });

    const prompt = buildPrompt(instructions, this.currentSourceText);
    this.chatHistory.push({ role: "user", content: prompt });

    if (this.inputEl) {
      this.inputEl.value = "";
    }

    const controller = new AbortController();
    this.requestController = controller;

    try {
      const text = await provider.generateText({
        model: this.selectedModel,
        messages: this.chatHistory,
        signal: controller.signal,
      });

      const trimmed = text.trim();

      if (!trimmed) {
        this.appendDisplayEntry({
          type: "error",
          message: "The model did not return any text.",
        });
        this.chatHistory.pop();
        this.setStatus("The model did not return any text.", "error");
        return;
      }

      this.chatHistory.push({ role: "assistant", content: trimmed });
      this.lastAssistantResponse = trimmed;
      this.currentSourceText = trimmed;
      this.appendDisplayEntry({ type: "assistant", text: trimmed });
      this.setStatus("Received response.");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        this.chatHistory.pop();
        this.setStatus("Request cancelled.");
      } else {
        console.error("Mondo: Edit with AI request failed", error);
        this.appendDisplayEntry({
          type: "error",
          message: error instanceof Error ? error.message : "Request failed.",
        });
        this.chatHistory.pop();
        this.setStatus("Request failed.", "error");
      }
    } finally {
      this.isRequestInFlight = false;
      this.requestController = null;
      this.updateActionButtons();
    }
  };
}

export const openEditWithAI = (
  plugin: Mondo,
  editor: Editor,
  view: MarkdownView | null
): boolean => {
  if (!view) {
    new Notice("Open a note to edit with AI.");
    return false;
  }

  const selection = editor.getSelection();
  const hasSelection = selection.length > 0;
  const initialText = hasSelection ? selection : editor.getValue();

  const range: SelectionRange | null = hasSelection
    ? { from: editor.getCursor("from"), to: editor.getCursor("to") }
    : null;

  const modal = new EditWithAIModal({
    app: plugin.app,
    plugin,
    editor,
    initialText,
    hasSelection,
    selectionRange: range,
  });

  modal.open();
  return true;
};
