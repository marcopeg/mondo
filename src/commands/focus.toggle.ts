import { App } from "obsidian";

// Minimal focus-mode implementation adapted from the provided plugin source.
// This intentionally keeps state module-scoped because the plugin runs once per app.
let focusActive = false;
let leftSplitCollapsed: boolean | null = null;
let rightSplitCollapsed: boolean | null = null;

export function enableJournalFocus(app: App) {
  if (focusActive) return;
  focusActive = true;

  try {
    // @ts-ignore - leftSplit/rightSplit are internal fields on Workspace
    leftSplitCollapsed = app.workspace.leftSplit?.collapsed ?? null;
    // @ts-ignore
    rightSplitCollapsed = app.workspace.rightSplit?.collapsed ?? null;
  } catch (e) {
    leftSplitCollapsed = null;
    rightSplitCollapsed = null;
  }

  try {
    // @ts-ignore
    app.workspace.leftSplit?.collapse?.();
  } catch (e) {
    // ignore
  }
  try {
    // @ts-ignore
    app.workspace.rightSplit?.collapse?.();
  } catch (e) {
    // ignore
  }

  try {
    // Add visual class so CSS can hide extra chrome
    document.body.classList.add("crm-journal-fullscreen");
  } catch (e) {
    // noop
  }

  try {
    // Try to maximise the root split container similar to FocusMode plugin
    // @ts-ignore
    app.workspace.rootSplit?.containerEl?.addClass?.("maximised");
    // @ts-ignore
    app.workspace.onLayoutChange?.();
  } catch (e) {
    // ignore
  }
}

export function disableJournalFocus(app: App) {
  if (!focusActive) return;

  try {
    if (leftSplitCollapsed === false) {
      // @ts-ignore
      app.workspace.leftSplit?.expand?.();
    }
  } catch (e) {
    // ignore
  }

  try {
    if (rightSplitCollapsed === false) {
      // @ts-ignore
      app.workspace.rightSplit?.expand?.();
    }
  } catch (e) {
    // ignore
  }

  try {
    document.body.classList.remove("focus-mode");
  } catch (e) {
    // noop
  }

  try {
    // @ts-ignore
    app.workspace.rootSplit?.containerEl?.removeClass?.("maximised");
    // @ts-ignore
    app.workspace.onLayoutChange?.();
  } catch (e) {
    // ignore
  }

  focusActive = false;
}

export function toggleJournalFocus(app: App) {
  if (focusActive) disableJournalFocus(app);
  else enableJournalFocus(app);
}
