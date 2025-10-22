import type { App } from "obsidian";
import type { CRMBaseDefinition } from "./baseDefinition";

export type NativeBaseRendererHandle = {
  destroy: () => void;
  update?: (definition: CRMBaseDefinition) => void;
};

type RenderFunction = (
  container: HTMLElement,
  definition: CRMBaseDefinition
) => NativeBaseRendererHandle | void;

type CandidateApi = {
  renderBase?: unknown;
  renderBaseInContainer?: unknown;
  createRenderer?: unknown;
};

const isBaseRendererHandle = (
  value: unknown
): value is NativeBaseRendererHandle => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Record<string, unknown>;
  return typeof maybe.destroy === "function";
};

const callRenderFunction = (
  fn: unknown,
  container: HTMLElement,
  definition: CRMBaseDefinition
): NativeBaseRendererHandle | null => {
  if (typeof fn !== "function") {
    return null;
  }

  const possible = (fn as RenderFunction)(container, definition);
  if (isBaseRendererHandle(possible)) {
    return possible;
  }

  return null;
};

const getCandidateApis = (app: App): CandidateApi[] => {
  const candidates: CandidateApi[] = [];
  const root = app as unknown as {
    bases?: unknown;
    workspace?: { bases?: unknown };
    plugins?: { plugins?: Record<string, unknown> };
    internalPlugins?: {
      plugins?: Record<string, { instance?: unknown }>;
      getPluginById?: (id: string) => { instance?: unknown } | null;
    };
  };

  if (root?.bases && typeof root.bases === "object") {
    candidates.push(root.bases as CandidateApi);
  }

  if (root?.workspace?.bases && typeof root.workspace.bases === "object") {
    candidates.push(root.workspace.bases as CandidateApi);
  }

  const pluginMap = root?.plugins?.plugins;
  if (pluginMap) {
    Object.keys(pluginMap)
      .filter((key) => key.toLowerCase().includes("base"))
      .forEach((key) => {
        const plugin = pluginMap[key];
        if (plugin && typeof plugin === "object") {
          candidates.push(plugin as CandidateApi);
        }
      });
  }

  const internalPlugins = root?.internalPlugins?.plugins ?? {};
  Object.keys(internalPlugins)
    .filter((key) => key.toLowerCase().includes("base"))
    .forEach((key) => {
      const plugin = internalPlugins[key];
      if (plugin?.instance && typeof plugin.instance === "object") {
        candidates.push(plugin.instance as CandidateApi);
      }
    });

  const byId = root?.internalPlugins?.getPluginById?.("properties");
  if (byId?.instance && typeof byId.instance === "object") {
    candidates.push(byId.instance as CandidateApi);
  }

  return candidates;
};

export const maybeRenderNativeBase = (
  app: App,
  container: HTMLElement,
  definition: CRMBaseDefinition
): NativeBaseRendererHandle | null => {
  const candidates = getCandidateApis(app);

  for (const candidate of candidates) {
    const handle =
      callRenderFunction(candidate.renderBaseInContainer, container, definition) ??
      callRenderFunction(candidate.renderBase, container, definition) ??
      callRenderFunction(candidate.createRenderer, container, definition);

    if (handle) {
      return handle;
    }
  }

  return null;
};
