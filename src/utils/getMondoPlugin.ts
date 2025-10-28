import type { App } from "obsidian";
import type Mondo from "@/main";

type MaybeApp = App | null | undefined;

type PluginManager = {
  getPlugin?: (id: string) => unknown;
};

type MaybeWithPlugins = {
  plugins?: PluginManager;
};

export const getMondoPlugin = (app: MaybeApp): Mondo | null => {
  if (!app) {
    return null;
  }

  const withPlugins = app as MaybeWithPlugins;
  const manager = withPlugins.plugins;
  if (!manager || typeof manager.getPlugin !== "function") {
    return null;
  }

  const plugin = manager.getPlugin("mondo");
  return (plugin as Mondo | undefined) ?? null;
};

export default getMondoPlugin;
