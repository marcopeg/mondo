import { useApp } from "@/hooks/use-app";
import { useEffect, useState } from "react";
import type { TFile, App } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

interface TabInfo {
  file?: TCachedFile;
}

export function useActiveTab(): TabInfo {
  const app = useApp();

  // initialize from current active editor tab
  const [tabInfo, setTabInfo] = useState<TabInfo>(() => {
    const activeFile = app.workspace.getActiveFile();
    return { file: activeFile ? createCachedFile(app, activeFile) : undefined };
  });

  useEffect(() => {
    const update = () => {
      const activeFile = app.workspace.getActiveFile();
      setTabInfo({
        file: activeFile ? createCachedFile(app, activeFile) : undefined,
      });
    };

    // react when user switches editor tabs
    const refOpen = app.workspace.on("file-open", update);

    // react when *any* file metadata changes
    const refMeta = app.metadataCache.on("changed", update);

    return () => {
      app.workspace.offref(refOpen);
      app.metadataCache.offref(refMeta);
    };
  }, [app]);

  return tabInfo;
}

function createCachedFile(app: App, file: TFile): TCachedFile {
  return {
    file,
    cache: app.metadataCache.getFileCache(file) || undefined,
  };
}
