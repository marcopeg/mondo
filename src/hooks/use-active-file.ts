// hooks/useActiveFile.ts
import { useApp } from "../hooks/use-app";
import { useEffect, useState } from "react";
import type { TFile } from "obsidian";

export function useActiveFile(): TFile | null {
  const app = useApp();
  const [file, setFile] = useState<TFile | null>(app.workspace.getActiveFile());
  const [tick, setTick] = useState(0); // force re-render on edits

  useEffect(() => {
    const handleFileOpen = (newFile: TFile | null) => {
      setFile(newFile);
    };

    const handleFileModify = (changed: TFile) => {
      if (file && changed.path === file.path) {
        setTick((t) => t + 1);
      }
    };

    const handleMetaChange = (changed: TFile) => {
      if (file && changed.path === file.path) {
        setTick((t) => t + 1);
      }
    };

    const refOpen = app.workspace.on("file-open", handleFileOpen);
    const refModify = app.vault.on("modify", handleFileModify);
    const refMeta = app.metadataCache.on("changed", handleMetaChange);

    return () => {
      app.workspace.offref(refOpen);
      app.vault.offref(refModify);
      app.metadataCache.offref(refMeta);
    };
  }, [app, file]);

  // depend on tick so component updates when file changes
  return file && tick >= 0 ? file : file;
}
