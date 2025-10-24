import { Platform, setIcon } from "obsidian";

export type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
  removeEventListener?: (type: "release", listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

type OverlayContainerOptions = {
  className?: string;
};

export class TranscriptionOverlay {
  private overlayEl: HTMLElement | null = null;

  private backdropEl: HTMLElement | null = null;

  private contentEl: HTMLElement | null = null;

  private containerEl: HTMLElement | null = null;

  private closeButtonEl: HTMLButtonElement | null = null;

  private overlayDismissHandler: (() => void) | null = null;

  private wakeLock: WakeLockSentinel | null = null;

  private wakeLockReleaseHandler: (() => void) | null = null;

  private readonly handleBackdropClick = (event: MouseEvent) => {
    if (!this.overlayDismissHandler) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.overlayDismissHandler();
  };

  ensureContainer = (options: OverlayContainerOptions = {}) => {
    if (this.containerEl && document.body.contains(this.containerEl)) {
      if (options.className) {
        this.containerEl.className = options.className;
      }
      return this.containerEl;
    }

    const overlay = document.body.createDiv({
      cls: "crm-transcription-overlay",
    });

    const backdrop = overlay.createDiv({
      cls: "crm-transcription-overlay__backdrop",
    });
    backdrop.setAttr("aria-hidden", "true");
    backdrop.addEventListener("click", this.handleBackdropClick);

    const content = overlay.createDiv({
      cls: "crm-transcription-overlay__content",
    });
    content.setAttr("role", "dialog");
    content.setAttr("aria-modal", "true");

    const closeButton = content.createEl("button", {
      cls: "clickable-icon crm-transcription-overlay__close",
    });
    closeButton.setAttr("type", "button");
    closeButton.setAttr("aria-label", "Dismiss");
    closeButton.setAttr("title", "Dismiss");
    closeButton.toggleAttribute("hidden", true);
    setIcon(closeButton, "x");

    const container = content.createDiv({
      cls: options.className ?? "crm-transcription-overlay__container",
    });

    this.overlayEl = overlay;
    this.backdropEl = backdrop;
    this.contentEl = content;
    this.closeButtonEl = closeButton;
    this.containerEl = container;

    return container;
  };

  setDismissHandler = (handler: (() => void) | null) => {
    this.overlayDismissHandler = handler ?? null;

    const closeButton = this.closeButtonEl;

    if (!closeButton) {
      return;
    }

    closeButton.onclick = null;

    if (!handler) {
      closeButton.toggleAttribute("hidden", true);
      return;
    }

    closeButton.toggleAttribute("hidden", false);
    closeButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    };
  };

  clear = () => {
    const container = this.containerEl;

    if (container) {
      container.replaceChildren();
    }
  };

  destroy = () => {
    this.backdropEl?.removeEventListener("click", this.handleBackdropClick);
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.backdropEl = null;
    this.contentEl = null;
    this.containerEl = null;
    this.closeButtonEl = null;
    this.overlayDismissHandler = null;
  };

  destroyIfEmpty = () => {
    const container = this.containerEl;

    if (!container || container.childElementCount > 0) {
      return;
    }

    this.destroy();
  };

  acquireWakeLock = async () => {
    if (!Platform.isMobileApp || this.wakeLock || typeof navigator === "undefined") {
      return;
    }

    const nav = navigator as NavigatorWithWakeLock;
    const wakeLockApi = nav.wakeLock;

    if (!wakeLockApi?.request) {
      return;
    }

    try {
      const sentinel = await wakeLockApi.request("screen");
      const releaseHandler = () => {
        if (this.wakeLock === sentinel) {
          this.wakeLock = null;
          this.wakeLockReleaseHandler = null;
        }
        sentinel.removeEventListener?.("release", releaseHandler);
      };

      sentinel.addEventListener?.("release", releaseHandler);

      this.wakeLock = sentinel;
      this.wakeLockReleaseHandler = releaseHandler;
    } catch (error) {
      console.debug("CRM: unable to acquire wake lock", error);
    }
  };

  releaseWakeLock = async () => {
    const sentinel = this.wakeLock;

    if (!sentinel) {
      return;
    }

    try {
      await sentinel.release();
    } catch (error) {
      console.debug("CRM: unable to release wake lock", error);
    } finally {
      if (this.wakeLockReleaseHandler) {
        sentinel.removeEventListener?.("release", this.wakeLockReleaseHandler);
      }

      this.wakeLock = null;
      this.wakeLockReleaseHandler = null;
    }
  };
}

export default TranscriptionOverlay;
