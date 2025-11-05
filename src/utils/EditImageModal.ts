import { App, Modal, Notice, Platform, TFile, setIcon } from "obsidian";

import { isImageFile } from "@/utils/fileTypeFilters";

type CropConstraint = {
  id: string;
  label: string;
  ratio: number | null;
};

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Point = {
  x: number;
  y: number;
};

type CropHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type PointerOperation =
  | {
      type: "move";
      startPointer: Point;
      startRect: Rect;
    }
  | {
      type: "resize";
      startPointer: Point;
      startRect: Rect;
      handle: CropHandle;
    };

const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

const STATIC_CONSTRAINTS: CropConstraint[] = [
  { id: "free", label: "Freeform", ratio: null },
  { id: "square", label: "1:1", ratio: 1 },
  { id: "4x3", label: "4:3", ratio: 4 / 3 },
  { id: "3x2", label: "3:2", ratio: 3 / 2 },
  { id: "16x9", label: "16:9", ratio: 16 / 9 },
  { id: "9x16", label: "9:16", ratio: 9 / 16 },
];

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
};

export const isImageEditSupported = (file: TFile): boolean =>
  isImageFile(file) && SUPPORTED_EXTENSIONS.has(file.extension.toLowerCase());

export const openEditImageModal = (app: App, file: TFile): void => {
  if (!isImageEditSupported(file)) {
    new Notice("Editing is supported for PNG, JPG, and WEBP images.");
    return;
  }

  new ImageEditModal(app, file).open();
};

class ImageEditModal extends Modal {
  private file: TFile;
  private imageEl: HTMLImageElement | null = null;
  private selectionEl: HTMLDivElement | null = null;
  private constraintButtons = new Map<string, HTMLButtonElement>();
  private currentConstraint: CropConstraint = {
    id: "current",
    label: "Current",
    ratio: null,
  };
  private newFileCheckbox: HTMLInputElement | null = null;
  private saveButtonEl: HTMLButtonElement | null = null;
  private deleteButtonEl: HTMLButtonElement | null = null;
  private closeButtonEl: HTMLButtonElement | null = null;
  private pointerOperation: PointerOperation | null = null;
  private pointerTarget: HTMLElement | null = null;
  private activePointerId: number | null = null;
  private naturalWidth = 0;
  private naturalHeight = 0;
  private minSelectionSize = 16;
  private selection: Rect | null = null;
  private constraintRatio: number | null = null;
  private activeConstraintId: string | null = null;
  private isProcessing = false;
  private scaleValue = 100;
  private scaleInputEl: HTMLInputElement | null = null;
  private scaleValueEl: HTMLSpanElement | null = null;
  private currentInfoEl: HTMLSpanElement | null = null;
  private finalDimensionsEl: HTMLSpanElement | null = null;
  private finalSizeEl: HTMLSpanElement | null = null;
  private previewUpdateTimer: number | null = null;
  private previewToken = 0;
  private originalSize = 0;
  private imageResizeObserver: ResizeObserver | null = null;
  private mobileMediaQuery: MediaQueryList | null = null;
  private isMobileLayout = false;
  private imageBlobUrl: string | null = null;

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
  }

  onOpen() {
    this.modalEl.addClass("mondo-crop-modal");
    this.contentEl.addClass("mondo-crop-modal__content");
    this.titleEl.setText(`Edit ${this.file.name}`);

    this.modalEl
      .querySelectorAll(".modal-close-button, .modal-close-x")
      .forEach((el) => {
        (el as HTMLElement).remove();
      });

    this.titleEl.addClass("mondo-crop-modal__title");
    const titleContainer = this.titleEl.parentElement;
    if (titleContainer instanceof HTMLElement) {
      const header = titleContainer.createDiv({
        cls: "mondo-crop-modal__header",
      });
      header.appendChild(this.titleEl);
      const closeButton = header.createEl("button", {
        cls: "mondo-crop-modal__close",
        attr: {
          type: "button",
          "aria-label": "Close image editor",
        },
      });
      const closeIcon = closeButton.createSpan({
        cls: "mondo-crop-modal__close-icon",
        attr: { "aria-hidden": "true" },
      });
      setIcon(closeIcon, "x");
      closeButton.addEventListener("click", () => {
        if (this.isProcessing) {
          return;
        }
        this.close();
      });
      this.closeButtonEl = closeButton;
    }

    if (typeof window !== "undefined" && "matchMedia" in window) {
      this.mobileMediaQuery = window.matchMedia("(max-width: 600px)");
      this.mobileMediaQuery.addEventListener(
        "change",
        this.handleMobileQueryChange
      );
      this.updateMobileLayout(
        Platform.isMobileApp || this.mobileMediaQuery.matches
      );
    } else {
      this.updateMobileLayout(Platform.isMobileApp);
    }

    const body = this.contentEl.createDiv({
      cls: "mondo-crop-modal__body",
    });

    const previewWrapper = body.createDiv({
      cls: "mondo-crop-modal__preview",
    });

    const imageContainer = previewWrapper.createDiv({
      cls: "mondo-crop-modal__image-container",
    });
    imageContainer.style.touchAction = "none";

    const image = imageContainer.createEl("img", {
      cls: "mondo-crop-modal__image",
    });
    image.alt = this.file.name;
    image.addEventListener("load", this.handleImageLoaded);
    image.addEventListener("error", this.handleImageError);
    this.imageEl = image;

    // Load image data as Blob to avoid canvas tainting issues on mobile
    void this.loadImageFromFile();

    if (typeof ResizeObserver !== "undefined") {
      this.imageResizeObserver = new ResizeObserver(() => {
        this.updateSelectionUI();
      });
      this.imageResizeObserver.observe(image);
    }

    const selection = imageContainer.createDiv({
      cls: "mondo-crop-modal__selection",
    });
    selection.style.display = "none";
    selection.addEventListener("pointerdown", this.handleSelectionPointerDown);
    this.selectionEl = selection;

    const handles: CropHandle[] = [
      "n",
      "s",
      "e",
      "w",
      "ne",
      "nw",
      "se",
      "sw",
    ];

    handles.forEach((handle) => {
      const handleEl = selection.createDiv({
        cls: `mondo-crop-modal__handle mondo-crop-modal__handle--${handle}`,
      });
      handleEl.dataset.handle = handle;
      handleEl.addEventListener("pointerdown", (event) => {
        this.beginPointerOperation(
          {
            type: "resize",
            handle,
            startPointer: this.translatePointer(event) ?? {
              x: 0,
              y: 0,
            },
            startRect: this.selection
              ? { ...this.selection }
              : {
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                },
          },
          event
        );
      });
    });

    const controls = body.createDiv({
      cls: "mondo-crop-modal__controls",
    });

    const constraintLabel = controls.createEl("div", {
      cls: "mondo-crop-modal__constraints-label",
    });
    constraintLabel.setText("Aspect ratio");

    const constraintList = controls.createDiv({
      cls: "mondo-crop-modal__constraints",
    });

    const constraints = [this.currentConstraint, ...STATIC_CONSTRAINTS];

    constraints.forEach((constraint) => {
      const button = constraintList.createEl("button", {
        text: constraint.label,
        cls: "mondo-crop-modal__constraint",
      });
      button.setAttr("type", "button");
      if (constraint.id === "current" && constraint.ratio === null) {
        button.disabled = true;
        button.setAttr("aria-disabled", "true");
      }
      button.addEventListener("click", () => {
        if (button.disabled) {
          return;
        }
        this.setConstraint(constraint);
      });
      this.constraintButtons.set(constraint.id, button);
    });

    this.setConstraint(this.currentConstraint);

    const scaleContainer = controls.createDiv({
      cls: "mondo-crop-modal__scale",
    });

    const scaleHeader = scaleContainer.createDiv({
      cls: "mondo-crop-modal__scale-header",
    });
    scaleHeader.createSpan({ text: "Scale" });
    this.scaleValueEl = scaleHeader.createSpan({
      cls: "mondo-crop-modal__scale-value",
      text: "100%",
    });

    this.scaleInputEl = scaleContainer.createEl("input", {
      type: "range",
      cls: "mondo-crop-modal__scale-input",
      attr: {
        min: "10",
        max: "500",
        step: "1",
        value: String(this.scaleValue),
      },
    });

    this.scaleInputEl.addEventListener("input", () => {
      this.scaleValue = Number.parseInt(this.scaleInputEl?.value ?? "100", 10);
      this.scaleValueEl?.setText(`${this.scaleValue}%`);
      this.schedulePreviewUpdate();
    });

    const summaryContainer = controls.createDiv({
      cls: "mondo-crop-modal__summary",
    });

    const currentRow = summaryContainer.createDiv({
      cls: "mondo-crop-modal__summary-item",
    });
    currentRow.createSpan({
      cls: "mondo-crop-modal__summary-label",
      text: "Current",
    });
    this.currentInfoEl = currentRow.createSpan({
      cls: "mondo-crop-modal__summary-data",
      text: "Loading…",
    });

    const finalRow = summaryContainer.createDiv({
      cls: "mondo-crop-modal__summary-item",
    });
    finalRow.createSpan({
      cls: "mondo-crop-modal__summary-label",
      text: "Estimated",
    });
    const finalValue = finalRow.createSpan({
      cls: "mondo-crop-modal__summary-data",
    });
    this.finalDimensionsEl = finalValue.createSpan({ text: "—" });
    finalValue.createSpan({
      cls: "mondo-crop-modal__summary-separator",
      text: "•",
    });
    this.finalSizeEl = finalValue.createSpan({ text: "—" });

    const footer = this.contentEl.createDiv({
      cls: "modal-button-container mondo-crop-modal__footer",
    });

    const footerInner = footer.createDiv({
      cls: "mondo-crop-modal__footer-inner",
    });

    const footerOption = footerInner.createDiv({
      cls: "mondo-crop-modal__footer-option",
    });

    const checkboxId = `mondo-edit-new-image-${Date.now()}`;
    const checkbox = footerOption.createEl("input", {
      type: "checkbox",
      cls: "mondo-crop-modal__checkbox",
    });
    checkbox.id = checkboxId;
    this.newFileCheckbox = checkbox;

    const checkboxLabel = footerOption.createEl("label", {
      attr: { for: checkboxId },
    });
    checkboxLabel.setText("Save as new image");

    const footerActions = footerInner.createDiv({
      cls: "mondo-crop-modal__footer-actions",
    });

    const deleteButton = footerActions.createEl("button", {
      cls: "mondo-crop-modal__delete",
      attr: { type: "button" },
    });
    const deleteIcon = deleteButton.createSpan({
      cls: "mondo-crop-modal__delete-icon",
      attr: { "aria-hidden": "true" },
    });
    setIcon(deleteIcon, "trash");
    deleteButton.createSpan({ text: "Delete" });
    deleteButton.addEventListener("click", () => {
      void this.handleDelete();
    });
    this.deleteButtonEl = deleteButton;

    const saveButton = footerActions.createEl("button", {
      text: "Save",
    });
    saveButton.addClass("mod-cta");
    saveButton.disabled = true;
    saveButton.addEventListener("click", () => {
      void this.handleSave();
    });
    this.saveButtonEl = saveButton;
  }

  onClose() {
    if (this.imageEl) {
      this.imageEl.removeEventListener("load", this.handleImageLoaded);
      this.imageEl.removeEventListener("error", this.handleImageError);
    }
    if (this.mobileMediaQuery) {
      this.mobileMediaQuery.removeEventListener(
        "change",
        this.handleMobileQueryChange
      );
      this.mobileMediaQuery = null;
    }
    this.updateMobileLayout(false);
    if (this.imageResizeObserver) {
      this.imageResizeObserver.disconnect();
      this.imageResizeObserver = null;
    }
    this.detachPointerListeners();
    this.pointerOperation = null;
    this.pointerTarget = null;
    this.activePointerId = null;
    if (this.previewUpdateTimer !== null) {
      window.clearTimeout(this.previewUpdateTimer);
      this.previewUpdateTimer = null;
    }
    if (this.imageBlobUrl) {
      URL.revokeObjectURL(this.imageBlobUrl);
      this.imageBlobUrl = null;
    }
    this.closeButtonEl = null;
    this.deleteButtonEl = null;
    this.saveButtonEl = null;
  }

  private loadImageFromFile = async () => {
    if (!this.imageEl) {
      return;
    }

    try {
      const arrayBuffer = await this.app.vault.readBinary(this.file);
      const mimeType = this.getMimeType();
      const blob = new Blob([arrayBuffer], { type: mimeType });
      this.imageBlobUrl = URL.createObjectURL(blob);
      this.imageEl.src = this.imageBlobUrl;
    } catch (error) {
      console.error("Mondo: Failed to load image file", error);
      this.handleImageError();
    }
  };

  private handleImageLoaded = () => {
    if (!this.imageEl || !this.selectionEl) {
      return;
    }

    this.naturalWidth = this.imageEl.naturalWidth;
    this.naturalHeight = this.imageEl.naturalHeight;
    this.originalSize = this.file.stat.size;

    this.updateCurrentConstraintState();

    if (!this.naturalWidth || !this.naturalHeight) {
      new Notice("Unable to load image dimensions for editing.");
      this.close();
      return;
    }

    const minDimension = Math.min(this.naturalWidth, this.naturalHeight);
    this.minSelectionSize = Math.max(16, Math.min(minDimension * 0.05, minDimension));

    this.selection = {
      left: 0,
      top: 0,
      right: this.naturalWidth,
      bottom: this.naturalHeight,
    };

    this.selectionEl.style.display = "block";
    this.updateSelectionUI();
    this.updateOriginalInfo();
    this.schedulePreviewUpdate();
    if (this.saveButtonEl) {
      this.saveButtonEl.disabled = false;
    }
  };

  private handleImageError = () => {
    new Notice("Failed to load the image for editing.");
    this.close();
  };

  private handleMobileQueryChange = (event: MediaQueryListEvent) => {
    this.updateMobileLayout(Platform.isMobileApp || event.matches);
  };

  private updateMobileLayout = (enable: boolean) => {
    if (enable === this.isMobileLayout) {
      return;
    }

    this.isMobileLayout = enable;
    this.modalEl.toggleClass("mondo-crop-modal--mobile", enable);
    this.updateSelectionUI();
  };

  private updateCurrentConstraintState = () => {
    const button = this.constraintButtons.get("current");
    if (!button) {
      return;
    }

    if (!this.naturalWidth || !this.naturalHeight) {
      this.currentConstraint.label = "Current";
      this.currentConstraint.ratio = null;
      button.setText(this.currentConstraint.label);
      button.disabled = true;
      button.setAttr("aria-disabled", "true");
      return;
    }

    this.currentConstraint.ratio = this.naturalWidth / this.naturalHeight;
    button.setText(this.currentConstraint.label);
    button.disabled = false;
    button.removeAttribute("aria-disabled");

    if (this.activeConstraintId === this.currentConstraint.id) {
      this.setConstraint(this.currentConstraint);
    }
  };

  private translatePointer = (event: PointerEvent): Point | null => {
    if (!this.imageEl || !this.naturalWidth || !this.naturalHeight) {
      return null;
    }

    const rect = this.imageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const x = ((event.clientX - rect.left) / rect.width) * this.naturalWidth;
    const y = ((event.clientY - rect.top) / rect.height) * this.naturalHeight;

    return {
      x: clamp(x, 0, this.naturalWidth),
      y: clamp(y, 0, this.naturalHeight),
    };
  };

  private beginPointerOperation = (
    operation: PointerOperation,
    event: PointerEvent
  ) => {
    if (!this.selection) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pointer = this.translatePointer(event);
    if (!pointer) {
      return;
    }

    const startRect = { ...this.selection };

    if (operation.type === "move") {
      this.pointerOperation = {
        type: "move",
        startPointer: pointer,
        startRect,
      };
    } else {
      this.pointerOperation = {
        type: "resize",
        handle: operation.handle,
        startPointer: pointer,
        startRect,
      };
    }

    this.activePointerId = event.pointerId;
    this.pointerTarget = event.currentTarget as HTMLElement;
    try {
      this.pointerTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      console.debug("Mondo: pointer capture failed", error);
    }

    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  };

  private handleSelectionPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    this.beginPointerOperation(
      {
        type: "move",
        startPointer: this.translatePointer(event) ?? { x: 0, y: 0 },
        startRect: this.selection
          ? { ...this.selection }
          : { left: 0, top: 0, right: 0, bottom: 0 },
      },
      event
    );
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.pointerOperation || event.pointerId !== this.activePointerId) {
      return;
    }

    const pointer = this.translatePointer(event);
    if (!pointer || !this.selection) {
      return;
    }

    if (this.pointerOperation.type === "move") {
      const dx = pointer.x - this.pointerOperation.startPointer.x;
      const dy = pointer.y - this.pointerOperation.startPointer.y;
      const start = this.pointerOperation.startRect;

      let left = start.left + dx;
      let top = start.top + dy;
      let right = start.right + dx;
      let bottom = start.bottom + dy;

      const width = right - left;
      const height = bottom - top;

      if (left < 0) {
        right -= left;
        left = 0;
      }
      if (top < 0) {
        bottom -= top;
        top = 0;
      }
      if (right > this.naturalWidth) {
        const overflow = right - this.naturalWidth;
        left -= overflow;
        right = this.naturalWidth;
      }
      if (bottom > this.naturalHeight) {
        const overflow = bottom - this.naturalHeight;
        top -= overflow;
        bottom = this.naturalHeight;
      }

      if (right - left < this.minSelectionSize || bottom - top < this.minSelectionSize) {
        const minWidth = Math.max(this.minSelectionSize, Math.min(this.naturalWidth, width));
        const minHeight = Math.max(this.minSelectionSize, Math.min(this.naturalHeight, height));
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        left = clamp(centerX - minWidth / 2, 0, this.naturalWidth - minWidth);
        right = left + minWidth;
        top = clamp(centerY - minHeight / 2, 0, this.naturalHeight - minHeight);
        bottom = top + minHeight;
      }

      this.selection = {
        left,
        top,
        right,
        bottom,
      };
      this.updateSelectionUI();
      return;
    }

    const next = this.calculateResize(pointer, this.pointerOperation.handle, this.pointerOperation.startRect);
    if (!next) {
      return;
    }

    this.selection = next;
    this.updateSelectionUI();
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.detachPointerListeners();
  };

  private detachPointerListeners = () => {
    if (this.pointerTarget && this.activePointerId !== null) {
      try {
        this.pointerTarget.releasePointerCapture(this.activePointerId);
      } catch (error) {
        console.debug("Mondo: release pointer capture failed", error);
      }
    }

    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.pointerOperation = null;
    this.pointerTarget = null;
    this.activePointerId = null;
  };

  private calculateResize = (
    pointer: Point,
    handle: CropHandle,
    startRect: Rect
  ): Rect | null => {
    if (!this.naturalWidth || !this.naturalHeight) {
      return null;
    }

    if (!this.constraintRatio) {
      return this.calculateResizeFree(pointer, handle, startRect);
    }

    return this.calculateResizeWithRatio(pointer, handle, startRect);
  };

  private calculateResizeFree = (
    pointer: Point,
    handle: CropHandle,
    startRect: Rect
  ): Rect => {
    let { left, top, right, bottom } = startRect;

    if (handle.includes("w")) {
      left = clamp(pointer.x, 0, right - this.minSelectionSize);
    }
    if (handle.includes("e")) {
      right = clamp(pointer.x, left + this.minSelectionSize, this.naturalWidth);
    }
    if (handle.includes("n")) {
      top = clamp(pointer.y, 0, bottom - this.minSelectionSize);
    }
    if (handle.includes("s")) {
      bottom = clamp(pointer.y, top + this.minSelectionSize, this.naturalHeight);
    }

    return this.ensureBounds({ left, top, right, bottom });
  };

  private calculateResizeWithRatio = (
    pointer: Point,
    handle: CropHandle,
    startRect: Rect
  ): Rect => {
    const ratio = this.constraintRatio ?? 1;
    const minSize = this.minSelectionSize;

    const clampX = (value: number) => clamp(value, 0, this.naturalWidth);
    const clampY = (value: number) => clamp(value, 0, this.naturalHeight);

    if (handle === "nw" || handle === "ne" || handle === "sw" || handle === "se") {
      const anchorX = handle.includes("w")
        ? startRect.right
        : startRect.left;
      const anchorY = handle.includes("n")
        ? startRect.bottom
        : startRect.top;

      const pointerX = clampX(pointer.x);
      const pointerY = clampY(pointer.y);

      const widthFromPointer = Math.max(
        minSize,
        Math.abs(anchorX - pointerX)
      );
      const heightFromPointer = Math.max(
        minSize,
        Math.abs(anchorY - pointerY)
      );

      let width: number;
      let height: number;

      if (widthFromPointer / heightFromPointer > ratio) {
        height = heightFromPointer;
        width = height * ratio;
      } else {
        width = widthFromPointer;
        height = width / ratio;
      }

      if (handle.includes("w")) {
        width = Math.min(width, anchorX);
      } else {
        width = Math.min(width, this.naturalWidth - anchorX);
      }

      if (handle.includes("n")) {
        height = Math.min(height, anchorY);
      } else {
        height = Math.min(height, this.naturalHeight - anchorY);
      }

      if (handle === "nw") {
        const left = clamp(anchorX - width, 0, anchorX - minSize);
        const top = clamp(anchorY - height, 0, anchorY - minSize);
        return this.ensureRatioBounds(
          {
            left,
            top,
            right: anchorX,
            bottom: anchorY,
          },
          ratio
        );
      }

      if (handle === "ne") {
        const right = clamp(anchorX + width, anchorX + minSize, this.naturalWidth);
        const top = clamp(anchorY - height, 0, anchorY - minSize);
        return this.ensureRatioBounds(
          {
            left: anchorX,
            top,
            right,
            bottom: anchorY,
          },
          ratio
        );
      }

      if (handle === "sw") {
        const left = clamp(anchorX - width, 0, anchorX - minSize);
        const bottom = clamp(anchorY + height, anchorY + minSize, this.naturalHeight);
        return this.ensureRatioBounds(
          {
            left,
            top: anchorY,
            right: anchorX,
            bottom,
          },
          ratio
        );
      }

      const right = clamp(anchorX + width, anchorX + minSize, this.naturalWidth);
      const bottom = clamp(anchorY + height, anchorY + minSize, this.naturalHeight);
      return this.ensureRatioBounds(
        {
          left: anchorX,
          top: anchorY,
          right,
          bottom,
        },
        ratio
      );
    }

    if (handle === "n" || handle === "s") {
      const anchor = handle === "n" ? startRect.bottom : startRect.top;
      const centerX = (startRect.left + startRect.right) / 2;
      const pointerY = clampY(pointer.y);

      let height = Math.max(minSize, Math.abs(anchor - pointerY));
      let width = height * ratio;
      if (width > this.naturalWidth) {
        width = this.naturalWidth;
        height = width / ratio;
      }

      let top: number;
      let bottom: number;
      if (handle === "n") {
        bottom = anchor;
        top = clamp(anchor - height, 0, anchor - minSize);
      } else {
        top = anchor;
        bottom = clamp(anchor + height, anchor + minSize, this.naturalHeight);
      }

      const halfWidth = width / 2;
      let left = centerX - halfWidth;
      let right = centerX + halfWidth;

      if (left < 0) {
        right -= left;
        left = 0;
      }
      if (right > this.naturalWidth) {
        const overflow = right - this.naturalWidth;
        left -= overflow;
        right = this.naturalWidth;
      }

      const fittedWidth = right - left;
      const fittedHeight = fittedWidth / ratio;

      if (handle === "n") {
        top = bottom - fittedHeight;
      } else {
        bottom = top + fittedHeight;
      }

      return this.ensureRatioBounds({ left, top, right, bottom }, ratio);
    }

    const anchor = handle === "w" ? startRect.right : startRect.left;
    const centerY = (startRect.top + startRect.bottom) / 2;
    const pointerX = clampX(pointer.x);

    let width = Math.max(minSize, Math.abs(anchor - pointerX));
    let height = width / ratio;

    if (height > this.naturalHeight) {
      height = this.naturalHeight;
      width = height * ratio;
    }

    let left: number;
    let right: number;
    if (handle === "w") {
      right = anchor;
      left = clamp(anchor - width, 0, anchor - minSize);
    } else {
      left = anchor;
      right = clamp(anchor + width, anchor + minSize, this.naturalWidth);
    }

    const halfHeight = height / 2;
    let top = centerY - halfHeight;
    let bottom = centerY + halfHeight;

    if (top < 0) {
      bottom -= top;
      top = 0;
    }
    if (bottom > this.naturalHeight) {
      const overflow = bottom - this.naturalHeight;
      top -= overflow;
      bottom = this.naturalHeight;
    }

    const fittedHeight = bottom - top;
    const fittedWidth = fittedHeight * ratio;

    if (handle === "w") {
      left = right - fittedWidth;
    } else {
      right = left + fittedWidth;
    }

    return this.ensureRatioBounds({ left, top, right, bottom }, ratio);
  };

  private ensureRatioBounds = (rect: Rect, ratio: number): Rect => {
    const clamped = this.ensureBounds(rect);
    const width = clamped.right - clamped.left;
    const height = clamped.bottom - clamped.top;

    if (width <= 0 || height <= 0) {
      return clamped;
    }

    const currentRatio = width / height;
    if (Math.abs(currentRatio - ratio) < 0.001) {
      return clamped;
    }

    let newWidth = width;
    let newHeight = height;

    if (currentRatio > ratio) {
      newWidth = height * ratio;
    } else {
      newHeight = width / ratio;
    }

    const centerX = (clamped.left + clamped.right) / 2;
    const centerY = (clamped.top + clamped.bottom) / 2;

    let left = centerX - newWidth / 2;
    let right = centerX + newWidth / 2;
    let top = centerY - newHeight / 2;
    let bottom = centerY + newHeight / 2;

    if (left < 0) {
      right -= left;
      left = 0;
    }
    if (right > this.naturalWidth) {
      const overflow = right - this.naturalWidth;
      left -= overflow;
      right = this.naturalWidth;
    }
    if (top < 0) {
      bottom -= top;
      top = 0;
    }
    if (bottom > this.naturalHeight) {
      const overflow = bottom - this.naturalHeight;
      top -= overflow;
      bottom = this.naturalHeight;
    }

    const adjustedWidth = right - left;
    const adjustedHeight = bottom - top;

    if (adjustedWidth <= 0 || adjustedHeight <= 0) {
      return clamped;
    }

    return {
      left,
      top,
      right,
      bottom,
    };
  };

  private ensureBounds = (rect: Rect): Rect => {
    let { left, top, right, bottom } = rect;

    if (left > right) {
      [left, right] = [right, left];
    }
    if (top > bottom) {
      [top, bottom] = [bottom, top];
    }

    left = clamp(left, 0, this.naturalWidth);
    right = clamp(right, 0, this.naturalWidth);
    top = clamp(top, 0, this.naturalHeight);
    bottom = clamp(bottom, 0, this.naturalHeight);

    if (right - left < this.minSelectionSize) {
      const midX = (left + right) / 2;
      const half = Math.min(
        this.minSelectionSize / 2,
        this.naturalWidth / 2
      );
      left = clamp(midX - half, 0, this.naturalWidth - this.minSelectionSize);
      right = left + Math.min(this.minSelectionSize, this.naturalWidth);
    }

    if (bottom - top < this.minSelectionSize) {
      const midY = (top + bottom) / 2;
      const half = Math.min(
        this.minSelectionSize / 2,
        this.naturalHeight / 2
      );
      top = clamp(midY - half, 0, this.naturalHeight - this.minSelectionSize);
      bottom = top + Math.min(this.minSelectionSize, this.naturalHeight);
    }

    return {
      left,
      top,
      right,
      bottom,
    };
  };

  private updateSelectionUI = () => {
    if (
      !this.selectionEl ||
      !this.selection ||
      !this.naturalWidth ||
      !this.naturalHeight ||
      !this.imageEl
    ) {
      return;
    }

    const { left, top, right, bottom } = this.selection;
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      return;
    }

    const containerRect = this.imageEl.parentElement?.getBoundingClientRect();
    const imageRect = this.imageEl.getBoundingClientRect();

    if (!containerRect || imageRect.width <= 0 || imageRect.height <= 0) {
      return;
    }

    const offsetX = imageRect.left - containerRect.left;
    const offsetY = imageRect.top - containerRect.top;

    const scaleX = imageRect.width / this.naturalWidth;
    const scaleY = imageRect.height / this.naturalHeight;

    this.selectionEl.style.left = `${offsetX + left * scaleX}px`;
    this.selectionEl.style.top = `${offsetY + top * scaleY}px`;
    this.selectionEl.style.width = `${width * scaleX}px`;
    this.selectionEl.style.height = `${height * scaleY}px`;

    this.schedulePreviewUpdate();
  };

  private updateOriginalInfo = () => {
    if (!this.currentInfoEl) {
      return;
    }

    if (!this.naturalWidth || !this.naturalHeight) {
      this.currentInfoEl.setText("—");
      return;
    }

    const sizeText = formatBytes(this.originalSize);
    this.currentInfoEl.setText(
      `${Math.round(this.naturalWidth)} × ${Math.round(this.naturalHeight)} px • ${sizeText}`
    );
  };

  private schedulePreviewUpdate = () => {
    if (this.previewUpdateTimer !== null) {
      window.clearTimeout(this.previewUpdateTimer);
    }

    this.previewUpdateTimer = window.setTimeout(() => {
      void this.updatePreview();
    }, 120);
  };

  private updatePreview = async () => {
    if (!this.selection || !this.imageEl) {
      this.finalDimensionsEl?.setText("—");
      this.finalSizeEl?.setText("—");
      return;
    }

    const selection = { ...this.selection };
    const selectionWidth = Math.max(
      1,
      Math.round(selection.right - selection.left)
    );
    const selectionHeight = Math.max(
      1,
      Math.round(selection.bottom - selection.top)
    );
    const scale = Math.max(this.scaleValue, 1) / 100;
    const targetWidth = Math.max(1, Math.round(selectionWidth * scale));
    const targetHeight = Math.max(1, Math.round(selectionHeight * scale));

    this.finalDimensionsEl?.setText(`${targetWidth} × ${targetHeight} px`);
    this.finalSizeEl?.setText("Calculating…");

    const token = ++this.previewToken;

    try {
      const blob = await this.generateEditedBlob(
        selection,
        targetWidth,
        targetHeight
      );

      if (token !== this.previewToken) {
        return;
      }

      this.finalDimensionsEl?.setText(`${targetWidth} × ${targetHeight} px`);
      this.finalSizeEl?.setText(formatBytes(blob.size));
    } catch (error) {
      console.error("Mondo: failed to prepare image preview", error);
      if (token !== this.previewToken) {
        return;
      }
      this.finalSizeEl?.setText("—");
    }
  };

  private setConstraint = (constraint: CropConstraint) => {
    this.constraintRatio = constraint.ratio;
    this.activeConstraintId = constraint.id;

    this.constraintButtons.forEach((button, id) => {
      if (id === constraint.id) {
        button.classList.add("is-active");
        button.setAttr("aria-pressed", "true");
      } else {
        button.classList.remove("is-active");
        button.setAttr("aria-pressed", "false");
      }
    });

    if (this.selection && this.constraintRatio) {
      this.selection = this.ensureRatioBounds(this.selection, this.constraintRatio);
      this.updateSelectionUI();
    } else if (this.selection) {
      this.updateSelectionUI();
    }
  };

  private getMimeType = (): string => {
    const extension = this.file.extension.toLowerCase();
    if (extension === "jpg" || extension === "jpeg") {
      return "image/jpeg";
    }
    if (extension === "webp") {
      return "image/webp";
    }
    return "image/png";
  };

  private handleSave = async () => {
    if (!this.selection || !this.imageEl || this.isProcessing) {
      return;
    }

    const selection = { ...this.selection };
    const selectionWidth = Math.round(selection.right - selection.left);
    const selectionHeight = Math.round(selection.bottom - selection.top);

    if (selectionWidth <= 0 || selectionHeight <= 0) {
      new Notice("Select an area to edit.");
      return;
    }

    const scale = Math.max(this.scaleValue, 1) / 100;
    const targetWidth = Math.max(1, Math.round(selectionWidth * scale));
    const targetHeight = Math.max(1, Math.round(selectionHeight * scale));

    this.isProcessing = true;
    if (this.saveButtonEl) {
      this.saveButtonEl.disabled = true;
    }
    if (this.deleteButtonEl) {
      this.deleteButtonEl.disabled = true;
    }
    if (this.closeButtonEl) {
      this.closeButtonEl.disabled = true;
    }

    const shouldCreateNewFile = this.newFileCheckbox?.checked ?? false;

    if (this.newFileCheckbox) {
      this.newFileCheckbox.disabled = true;
    }

    try {
      const blob = await this.generateEditedBlob(
        selection,
        targetWidth,
        targetHeight
      );
      const arrayBuffer = await blob.arrayBuffer();

      if (shouldCreateNewFile) {
        const newPath = await this.createEditedFile(
          arrayBuffer,
          targetWidth,
          targetHeight
        );
        new Notice(`Created ${newPath}`);
      } else {
        await this.app.vault.modifyBinary(this.file, arrayBuffer);
        new Notice(`Saved ${this.file.name} at ${targetWidth}×${targetHeight}.`);
      }

      this.close();
    } catch (error) {
      console.error("Mondo: Failed to edit image", error);
      new Notice("Editing image failed. Check the console for details.");
    } finally {
      this.isProcessing = false;
      if (this.saveButtonEl) {
        this.saveButtonEl.disabled = false;
      }
      if (this.deleteButtonEl) {
        this.deleteButtonEl.disabled = false;
      }
      if (this.closeButtonEl) {
        this.closeButtonEl.disabled = false;
      }
      if (this.newFileCheckbox) {
        this.newFileCheckbox.disabled = false;
      }
    }
  };

  private handleDelete = async () => {
    if (this.isProcessing) {
      return;
    }

    const confirmed = confirm(
      `Delete ${this.file.name}? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    const wasSaveDisabled = this.saveButtonEl?.disabled ?? false;

    this.isProcessing = true;
    if (this.saveButtonEl) {
      this.saveButtonEl.disabled = true;
    }
    if (this.deleteButtonEl) {
      this.deleteButtonEl.disabled = true;
    }
    if (this.closeButtonEl) {
      this.closeButtonEl.disabled = true;
    }

    try {
      await this.app.vault.delete(this.file);
      new Notice(`Deleted ${this.file.name}.`);
      this.close();
    } catch (error) {
      console.error("Mondo: Failed to delete image", error);
      new Notice("Deleting image failed. Check the console for details.");
    } finally {
      this.isProcessing = false;
      if (this.saveButtonEl) {
        this.saveButtonEl.disabled = wasSaveDisabled;
      }
      if (this.deleteButtonEl) {
        this.deleteButtonEl.disabled = false;
      }
      if (this.closeButtonEl) {
        this.closeButtonEl.disabled = false;
      }
    }
  };

  private generateEditedBlob = async (
    selection: Rect,
    width: number,
    height: number
  ): Promise<Blob> => {
    if (!this.imageEl) {
      throw new Error("Image not ready");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas not supported");
    }

    context.drawImage(
      this.imageEl,
      selection.left,
      selection.top,
      selection.right - selection.left,
      selection.bottom - selection.top,
      0,
      0,
      width,
      height
    );

    const mimeType = this.getMimeType();
    const quality = mimeType === "image/jpeg" ? 0.92 : undefined;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to encode edited image"));
        }
      }, mimeType, quality);
    });
  };

  private createEditedFile = async (
    arrayBuffer: ArrayBuffer,
    width: number,
    height: number
  ): Promise<string> => {
    const folder = this.file.parent?.path ?? "";
    const suffix = `${width}x${height}`;
    const extension = this.file.extension;

    let baseName = `${this.file.basename} ${suffix}`;
    let candidate = `${baseName}.${extension}`;
    let index = 1;

    const resolvePath = (name: string) => (folder ? `${folder}/${name}` : name);

    while (this.app.vault.getAbstractFileByPath(resolvePath(candidate))) {
      baseName = `${this.file.basename} ${suffix} (${index})`;
      candidate = `${baseName}.${extension}`;
      index += 1;
    }

    const targetPath = resolvePath(candidate);
    await this.app.vault.createBinary(targetPath, arrayBuffer);
    return candidate;
  };
}
