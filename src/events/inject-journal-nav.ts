import { WorkspaceLeaf, MarkdownView, Plugin } from "obsidian";

import { DEFAULT_MONDO_JOURNAL_SETTINGS } from "@/types/MondoOtherPaths";

const normalize = (p?: string) => (p ?? "").replace(/^\/+|\/+$/g, "");

export const getLeafFilePath = (leaf: WorkspaceLeaf | null): string | null => {
  if (!leaf) return null;

  const view = leaf.view;
  // Best: check the concrete view type
  if (view instanceof MarkdownView) {
    // MarkdownView.file is a TFile | null
    return view.file?.path ?? null;
  }

  // Fallback: check the view type string and use a safe cast
  const viewType = view?.getViewType?.();
  if (viewType === "markdown") {
    // some builds/typing setups may not expose MarkdownView, so use any
    return (view as any).file?.path ?? null;
  }

  // No file available for this leaf
  return null;
};

const PREV_ID = "mondo-focus-mode-nav-prev-btn";
const NEXT_ID = "mondo-focus-mode-nav-next-btn";

const makeButton = (
  id: string,
  title: string,
  svg: string,
  onClick: () => void
) => {
  let btn = document.getElementById(id) as HTMLButtonElement | null;
  if (btn) return btn;
  btn = document.createElement("button");
  btn.id = id;
  btn.className = "mondo-focus-mode-nav-btn";
  btn.title = title;
  btn.type = "button";
  btn.innerHTML = svg;
  // Call the provided handler, then blur the button so it doesn't stay focused.
  btn.addEventListener("click", (e) => {
    try {
      onClick();
    } finally {
      (e.currentTarget as HTMLElement).blur();
    }
  });
  // Prevent mousedown from focusing the element (avoids persistent focus ring)
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  document.body.appendChild(btn);
  return btn;
};

const removeNav = () => {
  [PREV_ID, NEXT_ID].forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.parentElement) el.parentElement.removeChild(el);
  });
};

const injectNav = (leaf: WorkspaceLeaf, plugin: Plugin) => {
  // Only inject into markdown views
  if (!(leaf?.view instanceof MarkdownView)) return;

  // Styles are provided by `src/styles.css` in the plugin. They include
  // positioning for #mondo-focus-mode-nav-prev-btn (left) and #mondo-focus-mode-nav-next-btn (right).

  const leftSvg = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const rightSvg = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  makeButton(PREV_ID, "Previous journal note", leftSvg, () => {
    const commands = (plugin.app as any).commands;
    commands.executeCommandById("mondo:journal-prev");
  });

  makeButton(NEXT_ID, "Next journal note", rightSvg, () => {
    const commands = (plugin.app as any).commands;
    commands.executeCommandById("mondo:journal-next");
  });
};

export const injectJournalNav =
  (plugin: Plugin) => (leaf: WorkspaceLeaf | null) => {
    const path = getLeafFilePath(leaf);

    // If there is no active leaf or file, ensure nav is removed.
    if (!leaf || !path) {
      removeNav();
      return;
    }

    // Read journal root from plugin settings (fall back to default if missing)
    const pluginAny = plugin as any;
    const journalRoot = normalize(
      pluginAny?.settings?.journal?.root ?? DEFAULT_MONDO_JOURNAL_SETTINGS.root
    );

    // If no configured journal root, remove nav.
    if (!journalRoot) {
      removeNav();
      return;
    }

    // Match like main.syncPanels: check if active file path starts with the
    // normalized journal root. This handles paths without leading slashes.
    if (
      path === journalRoot ||
      path.startsWith(journalRoot + "/") ||
      path.startsWith(journalRoot)
    ) {
      injectNav(leaf, plugin);
    } else {
      removeNav();
    }
  };
