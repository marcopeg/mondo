import { useApp } from "@/hooks/use-app";
import { useEffect, useState } from "react";
import type { App } from "obsidian";

/**
 * Read a plugin setting by dot path from the CRM plugin and keep it up-to-date
 * when Obsidian metadata changes (a cheap heuristic to refresh UI after saves).
 *
 * Example: useSetting("rootPaths.company", "/")
 */
export function useSetting<T = any>(path: string, defaultValue: T) {
  const app = useApp();
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const read = () => {
      const plugin = (app as any)?.plugins?.getPlugin?.("crm") as
        | any
        | undefined;
      const settings = plugin?.settings ?? {};
      const parts = path ? path.split(".") : [];
      let cur: any = settings;
      for (const p of parts) {
        if (cur == null) {
          cur = undefined;
          break;
        }
        cur = cur[p];
      }
      setValue(cur === undefined ? defaultValue : (cur as T));
    };

    // initial read
    read();

    // heuristic refresh: replay on metadata changes so UI updates after settings saved
    const refMeta = app.metadataCache.on("changed", read);
    return () => {
      app.metadataCache.offref(refMeta);
    };
  }, [app, path, defaultValue]);

  return value;
}
