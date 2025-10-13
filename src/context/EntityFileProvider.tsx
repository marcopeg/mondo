import React, { createContext, useContext, useEffect, useState } from "react";
import { useActiveTab } from "@/hooks/use-active-tab";
import { useApp } from "@/hooks/use-app";
import { CRMFileManager } from "@/utils/CRMFileManager";
import type { TCachedFile } from "@/types/TCachedFile";

type EntityFileContextValue = {
  path?: string;
};

const EntityFileContext = createContext<EntityFileContextValue | undefined>(
  undefined
);

type EntityFileProviderProps = React.PropsWithChildren<{
  path?: string;
}>;

export const EntityFileProvider = ({ path, children }: EntityFileProviderProps) => (
  <EntityFileContext.Provider value={{ path }}>{children}</EntityFileContext.Provider>
);

const useManagerFile = (path: string | undefined): TCachedFile | undefined => {
  const app = useApp();
  const [cached, setCached] = useState<TCachedFile | undefined>(() => {
    if (!path) return undefined;
    const manager = CRMFileManager.getInstance(app);
    return manager.getFileByPath(path) ?? undefined;
  });

  useEffect(() => {
    if (!path) {
      setCached(undefined);
      return;
    }

    const manager = CRMFileManager.getInstance(app);

    const update = () => {
      setCached(manager.getFileByPath(path) ?? undefined);
    };

    update();

    const listener = () => update();
    manager.addListener(listener);

    return () => {
      manager.removeListener(listener);
    };
  }, [app, path]);

  return cached;
};

export const useEntityFile = (): { file?: TCachedFile } => {
  const fallback = useActiveTab();
  const context = useContext(EntityFileContext);
  const cached = useManagerFile(context?.path);

  if (context?.path) {
    return { file: cached };
  }

  return fallback;
};
