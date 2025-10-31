import { App, Platform } from "obsidian";

export type FocusModeSource = "journal" | "manual";

const activeSources = new Set<FocusModeSource>();

const collapseWorkspaceSplits = (app: App) => {
  try {
    // @ts-ignore - leftSplit is internal to Workspace
    app.workspace.leftSplit?.collapse?.();
  } catch (_error) {
    // ignore failures collapsing the left split
  }

  try {
    // @ts-ignore - rightSplit is internal to Workspace
    app.workspace.rightSplit?.collapse?.();
  } catch (_error) {
    // ignore failures collapsing the right split
  }
};

const expandWorkspaceSplits = (app: App) => {
  try {
    if (!Platform.isMobileApp) {
      // @ts-ignore - leftSplit is internal to Workspace
      app.workspace.leftSplit?.expand?.();
    }
  } catch (_error) {
    // ignore failures expanding the left split
  }
};

const applyFocusModeClass = () => {
  try {
    document.body.classList.add("focus-mode");
  } catch (_error) {
    // ignore DOM issues
  }
};

const removeFocusModeClass = () => {
  try {
    document.body.classList.remove("focus-mode");
  } catch (_error) {
    // ignore DOM issues
  }
};

export const activateFocusMode = (app: App, source: FocusModeSource) => {
  if (activeSources.has(source)) {
    return;
  }

  const wasActive = activeSources.size > 0;
  activeSources.add(source);

  if (wasActive) {
    return;
  }

  collapseWorkspaceSplits(app);
  applyFocusModeClass();
};

export const deactivateFocusMode = (app: App, source: FocusModeSource) => {
  if (!activeSources.has(source)) {
    return;
  }

  activeSources.delete(source);

  if (activeSources.size > 0) {
    return;
  }

  removeFocusModeClass();
  expandWorkspaceSplits(app);
};

export const isFocusModeActive = () => activeSources.size > 0;

export const isFocusModeSourceActive = (source: FocusModeSource) =>
  activeSources.has(source);

export const resetFocusMode = (app: App) => {
  if (!activeSources.size) {
    removeFocusModeClass();
    return;
  }

  activeSources.clear();
  removeFocusModeClass();
  expandWorkspaceSplits(app);
};
