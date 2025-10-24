import { MarkdownView, Platform, setIcon } from "obsidian";
import type CRM from "@/main";
import { insertTimestamp } from "@/commands/timestamp.insert";

const TOOLBAR_SELECTORS = [
  ".mod-mobile .mobile-toolbar-options",
  ".mod-mobile .mobile-toolbar",
  ".mod-mobile .cm-mobile-toolbar",
];

export class TimestampToolbarManager {
  private readonly plugin: CRM;
  private button: HTMLButtonElement | null = null;
  private retryTimeout: number | null = null;
  private active = false;

  constructor(plugin: CRM) {
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
    button.className =
      "crm-mobile-toolbar-button crm-timestamp-toolbar-button";
    button.setAttribute("aria-label", "Insert timestamp");
    button.setAttribute("title", "Insert timestamp");
    button.addEventListener("click", () => {
      void insertTimestamp(this.plugin.app, this.plugin);
    });

    const icon = document.createElement("span");
    icon.className = "crm-mobile-toolbar-button__icon";
    setIcon(icon, "clock");
    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "crm-mobile-toolbar-button__label";
    label.textContent = "Timestamp";
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
