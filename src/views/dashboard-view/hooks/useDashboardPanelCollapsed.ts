import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/hooks/use-app";

type PersistedPanels = Record<string, boolean>;

type CollapseSetter = (collapsed: boolean) => void;

const DASHBOARD_PLUGIN_ID = "mondo";

const readPersistedState = (
  panels: unknown,
  panelKey: string
): boolean | undefined => {
  if (!panels || typeof panels !== "object") {
    return undefined;
  }

  const typed = panels as PersistedPanels;
  const value = typed[panelKey];
  return typeof value === "boolean" ? value : undefined;
};

export const useDashboardPanelCollapsed = (
  panelKey: string,
  defaultValue: boolean
): readonly [boolean, CollapseSetter] => {
  const app = useApp();
  const [collapsed, setCollapsed] = useState<boolean>(defaultValue);

  const read = useCallback(() => {
    const plugin = (app as any)?.plugins?.getPlugin?.(DASHBOARD_PLUGIN_ID) as
      | any
      | undefined;
    if (!plugin) {
      return;
    }

    const dashboardSettings = plugin.settings?.dashboard;
    const stored = readPersistedState(
      dashboardSettings?.collapsedPanels,
      panelKey
    );

    if (stored === undefined) {
      setCollapsed(defaultValue);
      return;
    }

    setCollapsed(stored);
  }, [app, defaultValue, panelKey]);

  useEffect(() => {
    read();

    const metadataCache = (app as any)?.metadataCache;
    const offRef = metadataCache?.on?.("changed", read);

    const removeSettingsListener = () => {
      try {
        window.removeEventListener("mondo:settings-updated", read);
      } catch (_) {
        // window may be unavailable in some environments
      }
    };

    try {
      window.addEventListener("mondo:settings-updated", read);
    } catch (_) {
      // window may be unavailable
    }

    return () => {
      if (offRef) {
        metadataCache?.offref?.(offRef);
      }
      removeSettingsListener();
    };
  }, [app, read]);

  const persist = useCallback<CollapseSetter>(
    (nextCollapsed) => {
      setCollapsed(nextCollapsed);

      const plugin = (app as any)?.plugins?.getPlugin?.(DASHBOARD_PLUGIN_ID) as
        | any
        | undefined;
      if (!plugin) {
        return;
      }

      const settings = plugin.settings ?? {};
      const dashboardSettings = settings.dashboard ?? {};
      const currentPanels =
        (dashboardSettings.collapsedPanels as PersistedPanels | undefined) ?? {};

      const nextPanels = {
        ...currentPanels,
        [panelKey]: nextCollapsed,
      };

      plugin.settings = {
        ...settings,
        dashboard: {
          ...dashboardSettings,
          collapsedPanels: nextPanels,
        },
      };

      const saveResult = plugin.saveSettings?.();
      if (saveResult && typeof saveResult.then === "function") {
        saveResult.catch((error: unknown) => {
          console.debug(
            `useDashboardPanelCollapsed: failed to persist ${panelKey} collapsed state`,
            error
          );
        });
      }

      try {
        window.dispatchEvent(new CustomEvent("mondo:settings-updated"));
      } catch (error) {
        console.debug(
          `useDashboardPanelCollapsed: failed to dispatch settings update for ${panelKey}`,
          error
        );
      }
    },
    [app, panelKey]
  );

  return [collapsed, persist] as const;
};

export default useDashboardPanelCollapsed;
