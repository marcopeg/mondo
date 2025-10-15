import type { App } from "obsidian";
import type CRM from "@/main";

type MaybeApp = App | null | undefined;

type PluginManager = {
  getPlugin?: (id: string) => unknown;
};

type MaybeWithPlugins = {
  plugins?: PluginManager;
};

export const getCRMPlugin = (app: MaybeApp): CRM | null => {
  if (!app) {
    return null;
  }

  const withPlugins = app as MaybeWithPlugins;
  const manager = withPlugins.plugins;
  if (!manager || typeof manager.getPlugin !== "function") {
    return null;
  }

  const plugin = manager.getPlugin("crm");
  return (plugin as CRM | undefined) ?? null;
};

export default getCRMPlugin;
