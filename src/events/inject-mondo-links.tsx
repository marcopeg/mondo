import React from "react";
import { createRoot, Root } from "react-dom/client";
import { Plugin, WorkspaceLeaf, MarkdownView, TFile } from "obsidian";
import { AppProvider } from "@/context/AppProvider";
import { EntityFileProvider } from "@/context/EntityFileProvider";
import { EntityPanel } from "@/containers/EntityPanel";
import type { TCachedFile } from "@/types/TCachedFile";
import { getLeafFilePath } from "./inject-journal-nav";
import { isMondoEntityType } from "@/types/MondoFileType";
import { resolveCoverImage } from "@/utils/resolveCoverImage";
import { onMondoConfigChange } from "@/entities";

const REACT_ROOT = Symbol("__mondo_react_root");
const INJECT_CLASS = "mondo-injected-hello";

type InjectionRecord = {
  node: HTMLElement;
  leaf: WorkspaceLeaf;
  leafId: string;
  path: string;
  metadataEl: HTMLElement | null;
  observer: MutationObserver | null;
  observerTarget: HTMLElement | null;
  structureObserver: MutationObserver | null;
  structureObserverTarget: HTMLElement | null;
  observerScheduled: boolean;
};

const injections = new Map<string, InjectionRecord>();

let configChangeUnsubscribe: (() => void) | null = null;

const getFrontmatterType = (
  path: string | null,
  plugin: Plugin
): string | null => {
  if (!path) return null;
  const file = plugin.app.vault.getAbstractFileByPath(path);
  if (!file || !(file instanceof TFile)) return null;
  const cache = plugin.app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter as Record<string, unknown> | undefined;
  return (fm?.type as string | undefined) ?? null;
};

const getCachedFile = (
  path: string,
  plugin: Plugin
): TCachedFile | undefined => {
  const file = plugin.app.vault.getAbstractFileByPath(path);
  if (!file || !(file instanceof TFile)) return undefined;
  const cache = plugin.app.metadataCache.getFileCache(file) || undefined;
  return { file, cache };
};

type InsertionTarget = {
  parent: HTMLElement;
  nextSibling: ChildNode | null;
  metadata: HTMLElement | null;
};

const getInsertionTarget = (leaf: WorkspaceLeaf): InsertionTarget | null => {
  if (!leaf || !(leaf.view instanceof MarkdownView)) return null;
  const container = (leaf.view as MarkdownView)
    .containerEl as HTMLElement | null;
  if (!container) return null;
  const metadata = container.querySelector(
    ".metadata-container"
  ) as HTMLElement | null;
  if (metadata && metadata.parentElement) {
    return {
      parent: metadata.parentElement as HTMLElement,
      nextSibling: metadata.nextSibling,
      metadata,
    };
  }
  if (container.parentElement) {
    return {
      parent: container.parentElement as HTMLElement,
      nextSibling: container.nextSibling,
      metadata: metadata ?? null,
    };
  }
  return null;
};

const createInjectionNode = (path: string) => {
  const wrapper = document.createElement("div");
  wrapper.className = INJECT_CLASS;
  wrapper.setAttribute("data-mondo-path", path);

  const mount = document.createElement("div");
  mount.className = "mondo-injected-hello-root";
  wrapper.appendChild(mount);

  return wrapper;
};

const getLeafContainer = (record: InjectionRecord): HTMLElement | null => {
  const leafContainer =
    (record.leaf as unknown as { containerEl?: HTMLElement })?.containerEl ??
    null;

  if (leafContainer && leafContainer.isConnected) {
    return leafContainer;
  }

  return record.node.closest(".workspace-leaf");
};

const findCoverButtons = (record: InjectionRecord): HTMLButtonElement[] => {
  const container = getLeafContainer(record);
  if (!container) {
    return [];
  }

  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>(".mondo-cover-thumbnail")
  );

  return buttons.filter((button) => button.dataset.coverLeaf === record.leafId);
};

const METADATA_FILE_VALUE_SELECTORS = [
  '.metadata-property[data-property-key="file"] .metadata-property-value',
  '.metadata-property[data-property-id="file"] .metadata-property-value',
  '.metadata-property[data-property-key="title"] .metadata-property-value',
  '.metadata-property[data-property-id="title"] .metadata-property-value',
];

type InlineTitlePlacement = {
  kind: "inline-title";
  container: HTMLElement;
  anchor: HTMLElement;
};

type ViewHeaderPlacement = {
  kind: "view-header";
  container: HTMLElement;
  anchor: HTMLElement;
};

type MetadataPlacement = {
  kind: "metadata";
  container: HTMLElement;
  anchor: ChildNode | null;
};

type CoverPlacement =
  | InlineTitlePlacement
  | ViewHeaderPlacement
  | MetadataPlacement;

const findInlineTitlePlacement = (
  record: InjectionRecord
): InlineTitlePlacement | null => {
  const container = getLeafContainer(record);
  if (!container) {
    return null;
  }

  const inlineTitle = container.querySelector<HTMLElement>(".inline-title");
  if (!inlineTitle || !inlineTitle.isConnected || !inlineTitle.parentElement) {
    return null;
  }

  return {
    kind: "inline-title",
    container: inlineTitle.parentElement,
    anchor: inlineTitle,
  };
};

const findViewHeaderPlacement = (
  record: InjectionRecord
): ViewHeaderPlacement | null => {
  const container = getLeafContainer(record);
  if (!container) {
    return null;
  }

  const titleContainer = container.querySelector<HTMLElement>(
    ".view-header-title-container"
  );
  if (!titleContainer) {
    return null;
  }

  const title =
    titleContainer.querySelector<HTMLElement>(".view-header-title") ??
    titleContainer.querySelector<HTMLElement>(".view-header-title-input");
  if (!title) {
    return null;
  }

  return {
    kind: "view-header",
    container: titleContainer,
    anchor: title,
  };
};

const findMetadataPlacement = (
  record: InjectionRecord
): MetadataPlacement | null => {
  const metadata = resolveMetadataContainer(record);
  if (!metadata) {
    return null;
  }

  // Strategy: place the cover thumbnail as the very first element
  // inside the note's details panel (metadata container).
  // We insert before the container's first child to ensure it appears on top.
  return {
    kind: "metadata",
    container: metadata,
    anchor: metadata.firstChild,
  };
};

const resolveCoverPlacement = (
  _record: InjectionRecord
): CoverPlacement | null => {
  // Cover thumbnail is now rendered inside the Mondo EntityHeader.
  // Avoid injecting cover elements into Obsidian's native title/metadata
  // to keep them in their original state.
  return null;
};

const getPlacementAnchor = (placement: CoverPlacement): ChildNode | null =>
  placement.anchor;

const INLINE_TITLE_CONTAINER_CLASS = "mondo-inline-title-with-cover";
const VIEW_HEADER_CONTAINER_CLASS = "mondo-view-header-with-cover";

const cleanupContainerContext = (container: Element | null) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  if (!container.querySelector(".mondo-cover-thumbnail")) {
    container.classList.remove(INLINE_TITLE_CONTAINER_CLASS);
    container.classList.remove(VIEW_HEADER_CONTAINER_CLASS);
  }
};

const applyPlacementContext = (
  button: HTMLButtonElement,
  placement: CoverPlacement
) => {
  button.dataset.coverContext = placement.kind;
  button.classList.add("mondo-cover-thumbnail");
  button.classList.toggle(
    "mondo-cover-thumbnail--inline-title",
    placement.kind === "inline-title"
  );
  button.classList.toggle(
    "mondo-cover-thumbnail--view-header",
    placement.kind === "view-header"
  );
  button.classList.toggle(
    "mondo-cover-thumbnail--metadata",
    placement.kind === "metadata"
  );

  placement.container.classList.toggle(
    INLINE_TITLE_CONTAINER_CLASS,
    placement.kind === "inline-title"
  );
  placement.container.classList.toggle(
    VIEW_HEADER_CONTAINER_CLASS,
    placement.kind === "view-header"
  );
};

const ensureCoverButton = (
  record: InjectionRecord,
  placement: CoverPlacement,
  existingButtons: HTMLButtonElement[]
): HTMLButtonElement => {
  let button =
    existingButtons.find(
      (candidate) => candidate.dataset.coverContext === placement.kind
    ) ?? null;

  existingButtons.forEach((candidate) => {
    if (candidate !== button) {
      candidate.remove();
    }
  });

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open cover image");
  }

  const anchor = getPlacementAnchor(placement);

  const previousParent = button.parentElement;

  if (button.parentElement !== placement.container) {
    placement.container.insertBefore(button, anchor);
  } else if (anchor && button.nextSibling !== anchor) {
    placement.container.insertBefore(button, anchor);
  } else if (!anchor && button.parentElement === placement.container) {
    placement.container.appendChild(button);
  }

  if (previousParent && previousParent !== button.parentElement) {
    cleanupContainerContext(previousParent);
  }

  button.dataset.coverLeaf = record.leafId;
  applyPlacementContext(button, placement);

  let img = button.querySelector<HTMLImageElement>("img");
  if (!img) {
    img = document.createElement("img");
    img.decoding = "async";
    img.loading = "lazy";
    button.appendChild(img);
  }

  return button;
};

const renderReact = (
  mount: HTMLElement,
  plugin: Plugin,
  path: string,
  Renderer: React.ComponentType
) => {
  let root = (mount as any)[REACT_ROOT] as Root | undefined;
  if (!root) {
    root = createRoot(mount);
    (mount as any)[REACT_ROOT] = root;
  }

  root.render(
    <React.StrictMode>
      <AppProvider app={plugin.app}>
        <EntityFileProvider path={path}>
          <Renderer />
        </EntityFileProvider>
      </AppProvider>
    </React.StrictMode>
  );
};

const resolveMetadataContainer = (
  record: InjectionRecord
): HTMLElement | null => {
  const current = record.metadataEl;
  if (current && current.isConnected) {
    return current;
  }

  let sibling: Element | null = record.node.previousElementSibling;
  while (sibling) {
    if (
      sibling instanceof HTMLElement &&
      sibling.classList.contains("metadata-container")
    ) {
      record.metadataEl = sibling;
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }

  const parent = record.node.parentElement;
  if (parent) {
    const candidate = parent.querySelector(
      ".metadata-container"
    ) as HTMLElement | null;
    if (candidate) {
      record.metadataEl = candidate;
      return candidate;
    }
  }

  record.metadataEl = null;
  return null;
};

const removeCoverButton = (button: HTMLButtonElement) => {
  const parent = button.parentElement;
  button.remove();
  cleanupContainerContext(parent);
};

const removeCoverThumbnail = (record: InjectionRecord) => {
  const buttons = findCoverButtons(record);
  buttons.forEach((button) => removeCoverButton(button));
};

const unmountAndRemove = (record: InjectionRecord) => {
  const mount = record.node.querySelector(
    ".mondo-injected-hello-root"
  ) as HTMLElement | null;
  if (mount) {
    try {
      const root = (mount as any)[REACT_ROOT] as Root | undefined;
      root?.unmount();
    } catch (e) {
      // noop
    }
  }

  record.observer?.disconnect();
  record.observer = null;
  record.observerTarget = null;
  record.observerScheduled = false;

  record.structureObserver?.disconnect();
  record.structureObserver = null;
  record.structureObserverTarget = null;

  removeCoverThumbnail(record);

  record.node.parentElement?.removeChild(record.node);
};

const normalizeTypeValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim().toLowerCase();
      }
    }
  }

  return "";
};

const scheduleCoverUpdate = (record: InjectionRecord, plugin: Plugin) => {
  if (record.observerScheduled) {
    return;
  }

  record.observerScheduled = true;

  const run = () => {
    record.observerScheduled = false;
    updateCoverThumbnail(record, plugin);
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
  } else {
    setTimeout(run, 0);
  }
};

const ensureMetadataObserver = (record: InjectionRecord, plugin: Plugin) => {
  const metadata = resolveMetadataContainer(record);
  if (!metadata) {
    if (record.observer) {
      record.observer.disconnect();
      record.observer = null;
      record.observerTarget = null;
      record.observerScheduled = false;
    }
    return;
  }

  if (record.observer && record.observerTarget === metadata) {
    return;
  }

  record.observer?.disconnect();
  record.observer = null;
  record.observerTarget = null;
  record.observerScheduled = false;

  const observer = new MutationObserver(() => {
    scheduleCoverUpdate(record, plugin);
  });

  observer.observe(metadata, { childList: true, subtree: true });
  record.observer = observer;
  record.observerTarget = metadata;
};

const isRelevantStructureNode = (node: Node): boolean => {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  if (
    node.classList.contains("inline-title") ||
    node.classList.contains("view-header-title") ||
    node.classList.contains("view-header-title-container") ||
    node.classList.contains("metadata-container")
  ) {
    return true;
  }

  if (
    node.querySelector(".inline-title") ||
    node.querySelector(".view-header-title") ||
    node.querySelector(".view-header-title-container") ||
    node.querySelector(".metadata-container")
  ) {
    return true;
  }

  return false;
};

const ensureStructureObserver = (record: InjectionRecord, plugin: Plugin) => {
  const container =
    (record.leaf as unknown as { containerEl?: HTMLElement })?.containerEl ??
    null;
  if (!container || !container.isConnected) {
    record.structureObserver?.disconnect();
    record.structureObserver = null;
    record.structureObserverTarget = null;
    return;
  }

  if (
    record.structureObserver &&
    record.structureObserverTarget === container
  ) {
    return;
  }

  record.structureObserver?.disconnect();
  record.structureObserver = null;
  record.structureObserverTarget = null;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);

      if (
        added.some(isRelevantStructureNode) ||
        removed.some(isRelevantStructureNode)
      ) {
        scheduleCoverUpdate(record, plugin);
        break;
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  record.structureObserver = observer;
  record.structureObserverTarget = container;
};

const updateCoverThumbnail = (record: InjectionRecord, plugin: Plugin) => {
  const existingButtons = findCoverButtons(record);

  const cached = getCachedFile(record.path, plugin);
  if (!cached) {
    existingButtons.forEach((button) => removeCoverButton(button));
    return;
  }

  const typeRaw = (cached.cache?.frontmatter ?? {}) as
    | Record<string, unknown>
    | undefined;
  const normalizedType = normalizeTypeValue(typeRaw?.type);
  if (!normalizedType || !isMondoEntityType(normalizedType)) {
    existingButtons.forEach((button) => removeCoverButton(button));
    return;
  }

  const cover = resolveCoverImage(plugin.app, cached);
  if (!cover) {
    existingButtons.forEach((button) => removeCoverButton(button));
    return;
  }

  const placement = resolveCoverPlacement(record);
  if (!placement) {
    existingButtons.forEach((button) => removeCoverButton(button));
    return;
  }

  const button = ensureCoverButton(record, placement, existingButtons);
  button.type = "button";
  button.setAttribute("aria-label", "Open cover image");

  const img = button.querySelector<HTMLImageElement>("img");
  if (!img) {
    return;
  }

  if (cover.kind === "vault") {
    const { file, resourcePath } = cover;
    button.dataset.coverKind = "vault";
    button.dataset.coverPath = file.path;
    button.title = `Open ${file.name}`;
    img.alt = file.name;
    if (img.src !== resourcePath) {
      img.src = resourcePath;
    }

    const openCover = async () => {
      try {
        const leaf = plugin.app.workspace.getLeaf(true);
        await leaf.openFile(file);
        plugin.app.workspace.revealLeaf(leaf);
      } catch (error) {
        console.error("Mondo: failed to open cover image", error);
      }
    };

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openCover();
    };
  } else {
    button.dataset.coverKind = "external";
    button.removeAttribute("data-cover-path");
    button.title = "Open cover image";
    img.alt = "Cover image";
    if (img.src !== cover.url) {
      img.src = cover.url;
    }

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open(cover.url, "_blank", "noopener,noreferrer");
    };
  }
};

const ensureInjectionForLeaf = (
  leaf: WorkspaceLeaf,
  leafId: string,
  plugin: Plugin
) => {
  const path = getLeafFilePath(leaf);
  const existing = injections.get(leafId);

  if (!path) {
    if (existing) {
      unmountAndRemove(existing);
      injections.delete(leafId);
    }
    return;
  }

  const type = getFrontmatterType(path, plugin);
  if (type && type.trim().toLowerCase() === "journal") {
    if (existing) {
      unmountAndRemove(existing);
      injections.delete(leafId);
    }
    return;
  }

  const cached = getCachedFile(path, plugin);
  if (!cached) {
    if (existing) {
      unmountAndRemove(existing);
      injections.delete(leafId);
    }
    return;
  }

  const target = getInsertionTarget(leaf);
  if (!target) {
    if (existing) {
      unmountAndRemove(existing);
      injections.delete(leafId);
    }
    return;
  }

  let record = existing;
  if (!record) {
    const node = createInjectionNode(path);
    target.parent.insertBefore(node, target.nextSibling);
    record = {
      node,
      leaf,
      leafId,
      path,
      metadataEl: target.metadata ?? null,
      observer: null,
      observerTarget: null,
      structureObserver: null,
      structureObserverTarget: null,
      observerScheduled: false,
    };
    injections.set(leafId, record);
  } else {
    record.leaf = leaf;
    if (record.node.parentElement !== target.parent) {
      target.parent.insertBefore(record.node, target.nextSibling);
    } else if (record.node.nextSibling !== target.nextSibling) {
      target.parent.insertBefore(record.node, target.nextSibling);
    }

    if (record.path !== path) {
      record.path = path;
      record.node.setAttribute("data-mondo-path", path);
    }

    if (record.metadataEl !== target.metadata) {
      record.observer?.disconnect();
      record.observer = null;
      record.observerTarget = null;
      record.observerScheduled = false;
    }

    record.metadataEl = target.metadata ?? record.metadataEl ?? null;
  }

  record.leaf = leaf;

  const mount = record.node.querySelector(
    ".mondo-injected-hello-root"
  ) as HTMLElement | null;
  if (mount) {
    renderReact(mount, plugin, path, EntityPanel);
  }

  ensureMetadataObserver(record, plugin);
  ensureStructureObserver(record, plugin);
  updateCoverThumbnail(record, plugin);
};

const cleanupMissingLeaves = (seenLeafIds: Set<string>) => {
  for (const [leafId, record] of injections) {
    if (!seenLeafIds.has(leafId)) {
      unmountAndRemove(record);
      injections.delete(leafId);
    }
  }
};

export const injectMondoLinks =
  (plugin: Plugin) => (_leaf: WorkspaceLeaf | null) => {
    if (!configChangeUnsubscribe) {
      configChangeUnsubscribe = onMondoConfigChange(() => {
        for (const [, record] of injections) {
          scheduleCoverUpdate(record, plugin);
        }
      });
    }

    const leaves = plugin.app.workspace.getLeavesOfType(
      "markdown"
    ) as WorkspaceLeaf[];
    const seen = new Set<string>();

    leaves.forEach((leaf) => {
      const leafId = (leaf as any).id as string | undefined;
      if (!leafId) return;
      seen.add(leafId);
      ensureInjectionForLeaf(leaf, leafId, plugin);
    });

    cleanupMissingLeaves(seen);
  };

export const disposeMondoLinkInjections = () => {
  for (const [, record] of injections) {
    unmountAndRemove(record);
  }
  injections.clear();
  configChangeUnsubscribe?.();
  configChangeUnsubscribe = null;
};
