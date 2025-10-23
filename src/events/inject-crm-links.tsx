import React from "react";
import { createRoot, Root } from "react-dom/client";
import { Plugin, WorkspaceLeaf, MarkdownView, TFile } from "obsidian";
import { AppProvider } from "@/context/AppProvider";
import { EntityFileProvider } from "@/context/EntityFileProvider";
import { EntityLinks } from "@/containers/EntityLinks";
import DailyNoteLinks from "@/containers/DailyNoteLinks";
import {
  isCRMFileType,
  isDailyNoteType,
  isSpecialCRMType,
} from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getLeafFilePath } from "./inject-journal-nav";

const REACT_ROOT = Symbol("__crm_react_root");
const INJECT_CLASS = "crm-injected-hello";

type InjectionRecord = {
  node: HTMLElement;
  leafId: string;
  path: string;
};

const injections = new Map<string, InjectionRecord>();

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

const getInsertionTarget = (
  leaf: WorkspaceLeaf
): { parent: HTMLElement; nextSibling: ChildNode | null } | null => {
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
    };
  }
  if (container.parentElement) {
    return {
      parent: container.parentElement as HTMLElement,
      nextSibling: container.nextSibling,
    };
  }
  return null;
};

const createInjectionNode = (path: string) => {
  const wrapper = document.createElement("div");
  wrapper.className = INJECT_CLASS;
  wrapper.setAttribute("data-crm-path", path);

  const mount = document.createElement("div");
  mount.className = "crm-injected-hello-root";
  wrapper.appendChild(mount);

  return wrapper;
};

type RendererComponent = React.ComponentType;

const resolveRenderer = (
  type: string | null,
  path: string,
  plugin: Plugin
): RendererComponent | null => {
  if (!type) {
    return null;
  }

  if (!isCRMFileType(type)) {
    return null;
  }

  // Special CRM types (daily notes, journal, etc.)
  if (isSpecialCRMType(type)) {
    if (isDailyNoteType(type)) {
      return DailyNoteLinks;
    }
    if (type === "journal") {
      return null; // Journal support can be added later
    }
    return null;
  }

  // CRM entities
  return EntityLinks;
};

const renderReact = (
  mount: HTMLElement,
  plugin: Plugin,
  path: string,
  Renderer: RendererComponent
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

const unmountAndRemove = (node: HTMLElement) => {
  const mount = node.querySelector(
    ".crm-injected-hello-root"
  ) as HTMLElement | null;
  if (mount) {
    try {
      const root = (mount as any)[REACT_ROOT] as Root | undefined;
      root?.unmount();
    } catch (e) {
      // noop
    }
  }
  node.parentElement?.removeChild(node);
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
      unmountAndRemove(existing.node);
      injections.delete(leafId);
    }
    return;
  }

  const type = getFrontmatterType(path, plugin);
  const Renderer = resolveRenderer(type, path, plugin);
  if (!Renderer) {
    if (existing) {
      unmountAndRemove(existing.node);
      injections.delete(leafId);
    }
    return;
  }

  const cached = getCachedFile(path, plugin);
  if (!cached) {
    if (existing) {
      unmountAndRemove(existing.node);
      injections.delete(leafId);
    }
    return;
  }

  const target = getInsertionTarget(leaf);
  if (!target) {
    if (existing) {
      unmountAndRemove(existing.node);
      injections.delete(leafId);
    }
    return;
  }

  let record = existing;
  if (!record) {
    const node = createInjectionNode(path);
    target.parent.insertBefore(node, target.nextSibling);
    record = { node, leafId, path };
    injections.set(leafId, record);
  } else {
    if (record.node.parentElement !== target.parent) {
      target.parent.insertBefore(record.node, target.nextSibling);
    } else if (record.node.nextSibling !== target.nextSibling) {
      target.parent.insertBefore(record.node, target.nextSibling);
    }

    if (record.path !== path) {
      record.path = path;
      record.node.setAttribute("data-crm-path", path);
    }
  }

  const mount = record.node.querySelector(
    ".crm-injected-hello-root"
  ) as HTMLElement | null;
  if (mount) {
    renderReact(mount, plugin, path, Renderer);
  }
};

const cleanupMissingLeaves = (seenLeafIds: Set<string>) => {
  for (const [leafId, record] of injections) {
    if (!seenLeafIds.has(leafId)) {
      unmountAndRemove(record.node);
      injections.delete(leafId);
    }
  }
};

export const injectCRMLinks =
  (plugin: Plugin) => (_leaf: WorkspaceLeaf | null) => {
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

export const disposeCRMLinkInjections = () => {
  for (const [, record] of injections) {
    unmountAndRemove(record.node);
  }
  injections.clear();
};
