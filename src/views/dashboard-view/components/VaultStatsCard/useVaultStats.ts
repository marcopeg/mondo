import { useCallback, useEffect, useState } from "react";
import type { EventRef, TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import {
  isAudioFile,
  isImageFile,
  isMarkdownFile,
} from "@/utils/fileTypeFilters";

type VaultStats = {
  notes: { count: number; size: number };
  images: { count: number; size: number };
  audio: { count: number; size: number };
  files: { count: number; size: number };
  totalSize: number;
};

const DEFAULT_STATS: VaultStats = {
  notes: { count: 0, size: 0 },
  images: { count: 0, size: 0 },
  audio: { count: 0, size: 0 },
  files: { count: 0, size: 0 },
  totalSize: 0,
};

const computeStats = (files: TFile[]): VaultStats => {
  let notes = { count: 0, size: 0 };
  let images = { count: 0, size: 0 };
  let audio = { count: 0, size: 0 };
  let attachments = { count: 0, size: 0 };
  let totalSize = 0;

  for (const file of files) {
    const size = file.stat.size ?? 0;
    totalSize += size;

    if (isMarkdownFile(file)) {
      notes = { count: notes.count + 1, size: notes.size + size };
      continue;
    }

    if (isImageFile(file)) {
      images = { count: images.count + 1, size: images.size + size };
      continue;
    }

    if (isAudioFile(file)) {
      audio = { count: audio.count + 1, size: audio.size + size };
      continue;
    }

    attachments = {
      count: attachments.count + 1,
      size: attachments.size + size,
    };
  }

  return { notes, images, audio, files: attachments, totalSize };
};

export const useVaultStats = (): VaultStats => {
  const app = useApp();
  const [stats, setStats] = useState<VaultStats>(DEFAULT_STATS);

  const collect = useCallback(() => {
    const files = app.vault.getFiles();
    setStats(computeStats(files));
  }, [app]);

  useEffect(() => {
    collect();

    const refs: EventRef[] = [];
    const handleChange = () => collect();

    refs.push(app.vault.on("create", handleChange));
    refs.push(app.vault.on("delete", handleChange));
    refs.push(app.vault.on("modify", handleChange));
    refs.push(app.vault.on("rename", handleChange));

    return () => {
      for (const ref of refs) {
        try {
          app.vault.offref(ref);
        } catch (error) {
          console.debug("useVaultStats: failed to detach vault listener", error);
        }
      }
    };
  }, [app, collect]);

  return stats;
};
