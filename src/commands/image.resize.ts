import {
  App,
  Modal,
  Notice,
  TAbstractFile,
  TFile,
} from "obsidian";

const SUPPORTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

type ResizePlan = {
  canvasWidth: number;
  canvasHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  outputWidth: number;
  outputHeight: number;
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
};

const getMimeTypeForExtension = (extension: string): string => {
  const normalized = extension.toLowerCase();

  if (normalized === "jpg" || normalized === "jpeg") {
    return "image/jpeg";
  }

  if (normalized === "png") {
    return "image/png";
  }

  if (normalized === "webp") {
    return "image/webp";
  }

  return "image/png";
};

const isSupportedImageFile = (file: TAbstractFile | null): file is TFile => {
  if (!(file instanceof TFile)) {
    return false;
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
};

const getSelectedFileFromExplorer = (app: App): TFile | null => {
  const leaves = app.workspace.getLeavesOfType("file-explorer");

  for (const leaf of leaves) {
    const view = leaf.view as unknown;

    if (view && typeof (view as { getSelectedFile?: () => TFile | null }).getSelectedFile === "function") {
      const selected = (view as { getSelectedFile: () => TFile | null }).getSelectedFile();

      if (isSupportedImageFile(selected)) {
        return selected;
      }
    }

    const file = (view as { file?: TAbstractFile | null })?.file ?? null;

    if (isSupportedImageFile(file)) {
      return file;
    }
  }

  return null;
};

export const findActiveOrSelectedImageFile = (app: App): TFile | null => {
  const activeFile = app.workspace.getActiveFile();

  if (isSupportedImageFile(activeFile)) {
    return activeFile;
  }

  return getSelectedFileFromExplorer(app);
};

class ResizeImageModal extends Modal {
  private readonly file: TFile;

  private imageEl: HTMLImageElement | null = null;

  private readonly canvas: HTMLCanvasElement = document.createElement("canvas");

  private readonly mimeType: string;

  private originalWidth = 0;

  private originalHeight = 0;

  private readonly originalSize: number;

  private sliderValue = 100;

  private isImageReady = false;

  private previewUpdateTimer: number | null = null;

  private previewToken = 0;

  private sliderContainerEl: HTMLDivElement | null = null;

  private previewDimensionsEl: HTMLSpanElement | null = null;

  private previewSizeEl: HTMLSpanElement | null = null;

  private goButtonEl: HTMLButtonElement | null = null;

  private statusEl: HTMLParagraphElement | null = null;

  private resizeAsCopy = false;

  private readonly estimatedState = {
    width: 0,
    height: 0,
    size: 0,
  };

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
    this.mimeType = getMimeTypeForExtension(file.extension);
    this.originalSize = file.stat.size;
  }

  onOpen() {
    this.modalEl.addClass("mondo-resize-image-modal");
    this.titleEl.setText("Resize Image");

    this.renderLayout();
    this.loadImage();
  }

  onClose() {
    this.imageEl?.remove();
    this.imageEl = null;
    this.sliderContainerEl = null;
    this.previewDimensionsEl = null;
    this.previewSizeEl = null;
    this.goButtonEl = null;
    this.statusEl = null;
    if (this.previewUpdateTimer !== null) {
      window.clearTimeout(this.previewUpdateTimer);
      this.previewUpdateTimer = null;
    }
    this.contentEl.empty();
  }

  private renderLayout = () => {
    const resourcePath = this.app.vault.getResourcePath(this.file);

    const infoContainer = this.contentEl.createDiv({
      cls: "mondo-resize-image-info",
    });

    const thumbnailContainer = infoContainer.createDiv({
      cls: "mondo-resize-image-thumbnail",
    });

    const imageEl = thumbnailContainer.createEl("img", {
      attr: { src: resourcePath, alt: this.file.name },
    });

    this.imageEl = imageEl;

    const detailsContainer = infoContainer.createDiv({
      cls: "mondo-resize-image-details",
    });

    detailsContainer.createEl("div", {
      cls: "mondo-resize-image-detail",
      text: `Path: ${this.file.path}`,
    });

    detailsContainer.createEl("div", {
      cls: "mondo-resize-image-detail",
      text: `Current size: ${formatBytes(this.originalSize)}`,
    });

    detailsContainer.createEl("div", {
      cls: "mondo-resize-image-detail",
      text: "Current dimensions: loading…",
      attr: { "data-dimensions": "" },
    });

    const modeContainer = this.contentEl.createDiv({
      cls: "mondo-resize-image-mode",
    });

    this.sliderContainerEl = modeContainer.createDiv({
      cls: "mondo-resize-image-slider",
    });

    const sliderLabel = this.sliderContainerEl.createEl("label", {
      cls: "mondo-resize-image-slider-label",
      text: "Scale",
    });

    const sliderInput = this.sliderContainerEl.createEl("input", {
      attr: {
        type: "range",
        min: "10",
        max: "500",
        step: "1",
        value: String(this.sliderValue),
      },
    });

    const sliderValueEl = sliderLabel.createSpan({
      cls: "mondo-resize-image-slider-value",
      text: ` ${this.sliderValue}%`,
    });

    sliderInput.addEventListener("input", () => {
      this.sliderValue = Number.parseInt(sliderInput.value, 10);
      sliderValueEl.setText(` ${this.sliderValue}%`);
      this.schedulePreviewUpdate();
    });

    const optionsContainer = this.contentEl.createDiv({
      cls: "mondo-resize-image-options",
    });

    const checkboxLabel = optionsContainer.createEl("label", {
      cls: "mondo-resize-image-checkbox",
    });

    const checkboxEl = checkboxLabel.createEl("input", {
      attr: { type: "checkbox" },
    });

    checkboxLabel.createSpan({
      text: "Resize as copy",
    });

    checkboxEl.addEventListener("change", () => {
      this.resizeAsCopy = checkboxEl.checked;
    });

    const previewContainer = this.contentEl.createDiv({
      cls: "mondo-resize-image-preview",
    });

    const previewDimensionsRow = previewContainer.createDiv({
      cls: "mondo-resize-image-preview-row",
    });

    previewDimensionsRow.createSpan({ text: "New dimensions:" });

    this.previewDimensionsEl = previewDimensionsRow.createSpan({
      cls: "mondo-resize-image-preview-value",
      text: "—",
    });

    const previewSizeRow = previewContainer.createDiv({
      cls: "mondo-resize-image-preview-row",
    });

    previewSizeRow.createSpan({ text: "Estimated size:" });

    this.previewSizeEl = previewSizeRow.createSpan({
      cls: "mondo-resize-image-preview-value",
      text: "—",
    });

    this.statusEl = this.contentEl.createEl("p", {
      cls: "mondo-resize-image-status",
      text: "",
    });

    const actionsContainer = this.contentEl.createDiv({
      cls: "mondo-resize-image-actions",
    });

    this.goButtonEl = actionsContainer.createEl("button", {
      cls: "mod-cta",
      text: "Go",
      attr: { type: "button", disabled: "true" },
    });

    this.goButtonEl.addEventListener("click", () => {
      void this.handleResize();
    });
  };

  private loadImage = () => {
    if (!this.imageEl) {
      this.showError("Unable to load image preview.");
      return;
    }

    const dimensionsEl = this.contentEl.querySelector<HTMLElement>(
      "[data-dimensions]"
    );

    if (!dimensionsEl) {
      return;
    }

    const onLoad = () => {
      this.originalWidth = this.imageEl?.naturalWidth ?? 0;
      this.originalHeight = this.imageEl?.naturalHeight ?? 0;
      dimensionsEl.setText(
        `Current dimensions: ${this.originalWidth} × ${this.originalHeight}`
      );
      this.isImageReady = true;
      this.schedulePreviewUpdate();
      this.imageEl?.removeEventListener("load", onLoad);
      this.imageEl?.removeEventListener("error", onError);
    };

    const onError = () => {
      this.showError("Failed to load image metadata.");
      this.imageEl?.removeEventListener("load", onLoad);
      this.imageEl?.removeEventListener("error", onError);
    };

    this.imageEl.addEventListener("load", onLoad);
    this.imageEl.addEventListener("error", onError);

    if (this.imageEl.complete) {
      if (this.imageEl.naturalWidth && this.imageEl.naturalHeight) {
        onLoad();
      } else {
        onError();
      }
    }
  };

  private showError = (message: string) => {
    this.statusEl?.setText(message);
    this.statusEl?.classList.add("is-error");
    this.goButtonEl?.setAttr("disabled", "true");
  };

  private schedulePreviewUpdate = () => {
    if (!this.isImageReady) {
      return;
    }

    if (this.previewUpdateTimer !== null) {
      window.clearTimeout(this.previewUpdateTimer);
    }

    this.previewUpdateTimer = window.setTimeout(() => {
      void this.updatePreview();
    }, 120);
  };

  private getResizePlan = (): ResizePlan | null => {
    if (!this.isImageReady || !this.imageEl) {
      return null;
    }

    const scale = Math.max(this.sliderValue, 1) / 100;
    const width = Math.max(1, Math.round(this.originalWidth * scale));
    const height = Math.max(1, Math.round(this.originalHeight * scale));

    return {
      canvasWidth: width,
      canvasHeight: height,
      drawX: 0,
      drawY: 0,
      drawWidth: width,
      drawHeight: height,
      outputWidth: width,
      outputHeight: height,
    };
  };

  private updatePreview = async () => {
    const plan = this.getResizePlan();

    if (!plan || !this.imageEl) {
      this.previewDimensionsEl?.setText("—");
      this.previewSizeEl?.setText("—");
      this.goButtonEl?.setAttr("disabled", "true");
      return;
    }

    this.previewDimensionsEl?.setText(
      `${plan.outputWidth} × ${plan.outputHeight}`
    );
    this.goButtonEl?.removeAttribute("disabled");

    const token = ++this.previewToken;

    try {
      const blob = await this.renderToBlob(plan);

      if (this.previewToken !== token) {
        return;
      }

      this.estimatedState.width = plan.outputWidth;
      this.estimatedState.height = plan.outputHeight;
      this.estimatedState.size = blob.size;
      this.previewSizeEl?.setText(formatBytes(blob.size));
      this.statusEl?.setText("");
      this.statusEl?.classList.remove("is-error");
    } catch (error) {
      console.error("Mondo: failed to prepare image preview", error);
      this.previewSizeEl?.setText("—");
      this.statusEl?.setText("Unable to prepare preview.");
      this.statusEl?.classList.add("is-error");
    }
  };

  private renderToBlob = (plan: ResizePlan): Promise<Blob> => {
    if (!this.imageEl) {
      return Promise.reject(new Error("Image not ready"));
    }

    const context = this.canvas.getContext("2d");

    if (!context) {
      return Promise.reject(new Error("Unable to create canvas context"));
    }

    this.canvas.width = plan.canvasWidth;
    this.canvas.height = plan.canvasHeight;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      this.imageEl,
      plan.drawX,
      plan.drawY,
      plan.drawWidth,
      plan.drawHeight
    );

    return new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to render image."));
            return;
          }

          resolve(blob);
        },
        this.mimeType
      );
    });
  };

  private handleResize = async () => {
    const plan = this.getResizePlan();

    if (!plan) {
      new Notice("Provide valid dimensions before resizing.");
      return;
    }

    this.goButtonEl?.setAttr("disabled", "true");
    this.statusEl?.setText("Processing…");
    this.statusEl?.classList.remove("is-error");

    try {
      const blob = await this.renderToBlob(plan);
      const arrayBuffer = await blob.arrayBuffer();

      if (this.resizeAsCopy) {
        const newPath = await this.ensureCopyPath(
          plan.outputWidth,
          plan.outputHeight
        );
        await this.app.vault.createBinary(newPath, arrayBuffer);
        new Notice(`Resized copy created: ${newPath}`);
      } else {
        await this.app.vault.modifyBinary(this.file, arrayBuffer);
        new Notice("Image resized successfully.");
      }

      this.close();
    } catch (error) {
      console.error("Mondo: failed to resize image", error);
      this.statusEl?.setText("Failed to resize image. Check console for details.");
      this.statusEl?.classList.add("is-error");
      this.goButtonEl?.removeAttribute("disabled");
    }
  };

  private ensureCopyPath = async (
    width: number,
    height: number
  ): Promise<string> => {
    const parent = this.file.parent;
    const directory = parent?.path ?? "";
    const baseName = this.file.basename;
    const extension = this.file.extension;
    const suffix = `${width}_${height}`;
    const candidate = `${baseName}_${suffix}.${extension}`;

    const resolvePath = (name: string) =>
      directory ? `${directory}/${name}` : name;

    let attempt = 0;

    while (true) {
      const fileName = attempt === 0 ? candidate : `${baseName}_${suffix}-${attempt}.${extension}`;
      const fullPath = resolvePath(fileName);
      const existing = this.app.vault.getAbstractFileByPath(fullPath);

      if (!existing) {
        return fullPath;
      }

      attempt += 1;
    }
  };
}

export const openResizeImageModal = (app: App, file: TFile) => {
  const modal = new ResizeImageModal(app, file);
  modal.open();
};
