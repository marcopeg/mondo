import { App, Notice, Plugin, TFile } from "obsidian";

/**
 * Handle paste events on property fields to support pasting binary streams (e.g., images)
 * from clipboard directly into properties like "cover".
 */

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
];

const getFileExtensionFromMimeType = (mimeType: string): string => {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };
  return map[mimeType] ?? "png";
};

const isImageType = (mimeType: string): boolean => {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
};

/**
 * Extract the property key from a metadata property element
 */
const getPropertyKey = (element: HTMLElement): string | null => {
  // Try data-property-key first (newer Obsidian versions)
  const key = element.dataset.propertyKey;
  if (key) {
    return key;
  }

  // Try data-property-id (fallback)
  const id = element.dataset.propertyId;
  if (id) {
    return id;
  }

  return null;
};

/**
 * Get the active file from the property element by traversing DOM
 */
const getFileFromPropertyElement = (
  app: App,
  element: HTMLElement
): TFile | null => {
  // Find the parent markdown view container
  const viewContent = element.closest(".markdown-source-view, .markdown-reading-view");
  if (!viewContent) {
    return null;
  }

  // Try to get the file path from the view
  const workspaceLeaf = app.workspace.getLeaf(false);
  const activeFile = app.workspace.getActiveFile();
  
  return activeFile;
};

/**
 * Handle paste event on a property field
 */
const handlePropertyPaste = async (
  event: ClipboardEvent,
  app: App,
  propertyElement: HTMLElement
): Promise<void> => {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return;
  }

  // Check if clipboard contains image data
  const items = Array.from(clipboardData.items);
  const imageItem = items.find((item) => isImageType(item.type));

  if (!imageItem) {
    // No image in clipboard, let default paste behavior proceed
    return;
  }

  const propertyKey = getPropertyKey(propertyElement);
  if (!propertyKey) {
    return;
  }

  // For now, we only support the "cover" property
  // This can be extended to support other file-based properties
  if (propertyKey !== "cover") {
    return;
  }

  // Prevent default paste behavior since we're handling it
  event.preventDefault();
  event.stopPropagation();

  const file = getFileFromPropertyElement(app, propertyElement);
  if (!file) {
    new Notice("Unable to determine the current note.");
    return;
  }

  try {
    // Get the image blob from clipboard
    const blob = imageItem.getAsFile();
    if (!blob) {
      new Notice("Failed to read image from clipboard.");
      return;
    }

    // Generate filename with timestamp to avoid conflicts
    const timestamp = new Date().getTime();
    const extension = getFileExtensionFromMimeType(imageItem.type);
    const filename = `pasted-image-${timestamp}.${extension}`;

    // Get available path for the attachment
    const targetPath = await app.fileManager.getAvailablePathForAttachment(
      filename,
      file.path
    );

    // Convert blob to ArrayBuffer and create file in vault
    const arrayBuffer = await blob.arrayBuffer();
    const created = await app.vault.createBinary(targetPath, arrayBuffer);

    let targetFile: TFile | null = null;
    if (created instanceof TFile) {
      targetFile = created;
    } else {
      const abstract = app.vault.getAbstractFileByPath(targetPath);
      if (abstract instanceof TFile) {
        targetFile = abstract;
      }
    }

    if (!targetFile) {
      throw new Error("Failed to create image attachment");
    }

    // Generate the link text relative to the current file
    const linktext = app.metadataCache.fileToLinktext(
      targetFile,
      file.path,
      false
    );

    // Update the frontmatter with the new cover link
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[propertyKey] = `[[${linktext}]]`;
    });

    new Notice("Image pasted and linked successfully.");
  } catch (error) {
    console.error("Mondo: Failed to paste image into property", error);
    new Notice("Failed to paste image. Please try again.");
  }
};

/**
 * Set up paste event listener on property fields
 */
const setupPropertyPasteListener = (
  container: HTMLElement,
  app: App
): (() => void) => {
  const handlePaste = (event: Event) => {
    if (!(event instanceof ClipboardEvent)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    // Check if the paste happened within a metadata property
    const propertyElement = target.closest<HTMLElement>(".metadata-property");
    if (!propertyElement) {
      return;
    }

    void handlePropertyPaste(event, app, propertyElement);
  };

  // Use capture phase to intercept paste events before they reach the property input
  container.addEventListener("paste", handlePaste, true);

  return () => {
    container.removeEventListener("paste", handlePaste, true);
  };
};

/**
 * Map to track cleanup functions for each leaf
 */
const cleanupFunctions = new Map<string, () => void>();

/**
 * Inject paste handler for property fields in a markdown view
 */
export const injectPropertyPasteHandler = (plugin: Plugin) => () => {
  const leaves = plugin.app.workspace.getLeavesOfType("markdown");

  const seenLeafIds = new Set<string>();

  leaves.forEach((leaf) => {
    const leafId = (leaf as any).id as string | undefined;
    if (!leafId) {
      return;
    }

    seenLeafIds.add(leafId);

    // Skip if already set up
    if (cleanupFunctions.has(leafId)) {
      return;
    }

    const container = (leaf as any).containerEl as HTMLElement | undefined;
    if (!container) {
      return;
    }

    const cleanup = setupPropertyPasteListener(container, plugin.app);
    cleanupFunctions.set(leafId, cleanup);
  });

  // Clean up listeners for leaves that no longer exist
  for (const [leafId, cleanup] of cleanupFunctions) {
    if (!seenLeafIds.has(leafId)) {
      cleanup();
      cleanupFunctions.delete(leafId);
    }
  }
};

/**
 * Dispose all property paste handlers
 */
export const disposePropertyPasteHandlers = () => {
  for (const [, cleanup] of cleanupFunctions) {
    cleanup();
  }
  cleanupFunctions.clear();
};
