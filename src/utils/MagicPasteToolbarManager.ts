import { MarkdownView, Platform, setIcon } from "obsidian";
import type Mondo from "@/main";
import { openMagicPaste } from "@/commands/note.magicPaste";

const TOOLBAR_SELECTORS = [
  ".mod-mobile .mobile-toolbar-options",
  ".mod-mobile .mobile-toolbar",
  ".mod-mobile .cm-mobile-toolbar",
];

export class MagicPasteToolbarManager {
  private readonly plugin: Mondo;
  private button: HTMLButtonElement | null = null;
  private retryTimeout: number | null = null;
  private active = false;

  constructor(plugin: Mondo) {
    this.plugin = plugin;
  }

  initialize = () => {
    if (this.active) {
      return;
    }

    this.active = true;

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", this.update)
    );
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", this.update)
    );
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", this.update)
    );
  };

  dispose = () => {
    this.destroyButton();
    this.active = false;
  };

  activateMobileToolbar = () => {
    this.update();
  };

  private update = () => {
    if (!Platform.isMobileApp) {
      this.destroyButton();
      return;
    }

    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      this.destroyButton();
      return;
    }

    const container = this.findToolbarContainer();
    if (!container) {
      this.scheduleRetry();
      return;
    }

    this.ensureButton(container);
  };

  private ensureButton = (container: HTMLElement) => {
    if (this.button && this.button.isConnected) {
      return;
    }

    this.destroyButton();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mondo-mobile-toolbar-button mondo-magic-paste-toolbar-button";
    button.setAttribute("aria-label", "Magic paste");
    button.setAttribute("title", "Magic paste");
    button.addEventListener("click", () => {
      const activeView = this.plugin.app.workspace.getActiveViewOfType(
        MarkdownView
      );

      void openMagicPaste(this.plugin.app, this.plugin, {
        view: activeView ?? undefined,
        editor: activeView?.editor ?? undefined,
      });
    });

    const icon = document.createElement("span");
    icon.className = "mondo-mobile-toolbar-button__icon";
    setIcon(icon, "clipboard-paste");
    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "mondo-mobile-toolbar-button__label";
    label.textContent = "Magic Paste";
    button.appendChild(label);

    if (container.firstChild) {
      container.insertBefore(button, container.firstChild);
    } else {
      container.appendChild(button);
    }

    this.button = button;
  };

  private scheduleRetry = () => {
    if (this.retryTimeout !== null) {
      return;
    }

    this.retryTimeout = window.setTimeout(() => {
      this.retryTimeout = null;
      this.update();
    }, 200);
  };

  private destroyButton = () => {
    if (this.retryTimeout !== null) {
      window.clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.button) {
      this.button.remove();
      this.button = null;
    }
  };

  private findToolbarContainer = () => {
    for (const selector of TOOLBAR_SELECTORS) {
      const element = document.body.querySelector(selector);
      if (element instanceof HTMLElement) {
        return element;
      }
    }

    return null;
  };
}
