import { App, Modal, Notice, TFile } from "obsidian";

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

const gcd = (a: number, b: number): number => {
  let valueA = Math.abs(a);
  let valueB = Math.abs(b);

  while (valueB !== 0) {
    const temp = valueB;
    valueB = valueA % valueB;
    valueA = temp;
  }

  return valueA || 1;
};

const formatCurrentConstraintLabel = (width: number, height: number): string => {
  const divisor = gcd(width, height);
  const simplifiedWidth = Math.round(width / divisor);
  const simplifiedHeight = Math.round(height / divisor);

  return `Current (${simplifiedWidth}:${simplifiedHeight})`;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const isCropSupported = (file: TFile): boolean =>
  isImageFile(file) && SUPPORTED_EXTENSIONS.has(file.extension.toLowerCase());

export const openCropImageModal = (app: App, file: TFile): void => {
  if (!isCropSupported(file)) {
    new Notice(
      "Cropping is supported for PNG, JPG, and WEBP images."
    );
    return;
  }

  new CropImageModal(app, file).open();
};

class CropImageModal extends Modal {
  private file: TFile;
  private imageEl: HTMLImageElement | null = null;
  private selectionEl: HTMLDivElement | null = null;
  private constraintButtons = new Map<string, HTMLButtonElement>();
  private currentConstraint: CropConstraint = {
    id: "current",
    label: "Current",
    ratio: null,
  };
  private dimensionLabelEl: HTMLDivElement | null = null;
  private newFileCheckbox: HTMLInputElement | null = null;
  private cropButtonEl: HTMLButtonElement | null = null;
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

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
  }

  onOpen() {
    this.modalEl.addClass("mondo-crop-modal");
    this.titleEl.setText(`Crop ${this.file.name}`);

    const description = this.contentEl.createDiv({
      cls: "mondo-crop-modal__description",
    });
    description.setText(
      "Adjust the crop area, choose an aspect ratio, then apply your changes."
    );

    const previewWrapper = this.contentEl.createDiv({
      cls: "mondo-crop-modal__preview",
    });

    const imageContainer = previewWrapper.createDiv({
      cls: "mondo-crop-modal__image-container",
    });

    const image = imageContainer.createEl("img", {
      cls: "mondo-crop-modal__image",
    });
    image.alt = this.file.name;
    image.addEventListener("load", this.handleImageLoaded);
    image.addEventListener("error", this.handleImageError);
    image.src = this.app.vault.getResourcePath(this.file);
    this.imageEl = image;

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

    const controls = this.contentEl.createDiv({
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

    this.dimensionLabelEl = controls.createDiv({
      cls: "mondo-crop-modal__dimensions",
    });

    const newFileOption = controls.createDiv({
      cls: "mondo-crop-modal__option",
    });

    const checkboxId = `mondo-crop-new-image-${Date.now()}`;
    const checkbox = newFileOption.createEl("input", {
      type: "checkbox",
      cls: "mondo-crop-modal__checkbox",
    });
    checkbox.id = checkboxId;
    this.newFileCheckbox = checkbox;

    const checkboxLabel = newFileOption.createEl("label", {
      attr: { for: checkboxId },
    });
    checkboxLabel.setText("Crop as a new image");

    const footer = this.contentEl.createDiv({
      cls: "modal-button-container",
    });

    const cancelButton = footer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      if (this.isProcessing) {
        return;
      }
      this.close();
    });

    const cropButton = footer.createEl("button", {
      text: "Crop",
    });
    cropButton.addClass("mod-cta");
    cropButton.disabled = true;
    cropButton.addEventListener("click", () => {
      void this.handleCrop();
    });
    this.cropButtonEl = cropButton;
  }

  onClose() {
    if (this.imageEl) {
      this.imageEl.removeEventListener("load", this.handleImageLoaded);
      this.imageEl.removeEventListener("error", this.handleImageError);
    }
    this.detachPointerListeners();
    this.pointerOperation = null;
    this.pointerTarget = null;
    this.activePointerId = null;
  }

  private handleImageLoaded = () => {
    if (!this.imageEl || !this.selectionEl) {
      return;
    }

    this.naturalWidth = this.imageEl.naturalWidth;
    this.naturalHeight = this.imageEl.naturalHeight;

    this.updateCurrentConstraintState();

    if (!this.naturalWidth || !this.naturalHeight) {
      new Notice("Unable to load image dimensions for cropping.");
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
    if (this.cropButtonEl) {
      this.cropButtonEl.disabled = false;
    }
  };

  private handleImageError = () => {
    new Notice("Failed to load the image for cropping.");
    this.close();
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

    this.currentConstraint.label = formatCurrentConstraintLabel(
      this.naturalWidth,
      this.naturalHeight
    );
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
    if (!this.selectionEl || !this.selection || !this.naturalWidth || !this.naturalHeight) {
      return;
    }

    const { left, top, right, bottom } = this.selection;
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      return;
    }

    const leftPercent = (left / this.naturalWidth) * 100;
    const topPercent = (top / this.naturalHeight) * 100;
    const widthPercent = (width / this.naturalWidth) * 100;
    const heightPercent = (height / this.naturalHeight) * 100;

    this.selectionEl.style.left = `${leftPercent}%`;
    this.selectionEl.style.top = `${topPercent}%`;
    this.selectionEl.style.width = `${widthPercent}%`;
    this.selectionEl.style.height = `${heightPercent}%`;

    this.updateDimensionsLabel(width, height);
  };

  private updateDimensionsLabel = (width: number, height: number) => {
    if (!this.dimensionLabelEl) {
      return;
    }

    this.dimensionLabelEl.setText(
      `Crop area: ${Math.round(width)} × ${Math.round(height)} px`
    );
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

  private handleCrop = async () => {
    if (!this.selection || !this.imageEl || this.isProcessing) {
      return;
    }

    const width = Math.round(this.selection.right - this.selection.left);
    const height = Math.round(this.selection.bottom - this.selection.top);

    if (width <= 0 || height <= 0) {
      new Notice("Select an area to crop.");
      return;
    }

    this.isProcessing = true;
    if (this.cropButtonEl) {
      this.cropButtonEl.disabled = true;
    }

    try {
      const blob = await this.generateCroppedBlob(width, height);
      const arrayBuffer = await blob.arrayBuffer();

      if (this.newFileCheckbox?.checked) {
        const newPath = await this.createCroppedFile(arrayBuffer, width, height);
        new Notice(`Created ${newPath}`);
      } else {
        await this.app.vault.modifyBinary(this.file, arrayBuffer);
        new Notice(`Cropped ${this.file.name} to ${width}×${height}.`);
      }

      this.close();
    } catch (error) {
      console.error("Mondo: Failed to crop image", error);
      new Notice("Cropping image failed. Check the console for details.");
    } finally {
      this.isProcessing = false;
      if (this.cropButtonEl) {
        this.cropButtonEl.disabled = false;
      }
    }
  };

  private generateCroppedBlob = async (
    width: number,
    height: number
  ): Promise<Blob> => {
    if (!this.imageEl || !this.selection) {
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
      this.selection.left,
      this.selection.top,
      this.selection.right - this.selection.left,
      this.selection.bottom - this.selection.top,
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
          reject(new Error("Unable to encode cropped image"));
        }
      }, mimeType, quality);
    });
  };

  private createCroppedFile = async (
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
