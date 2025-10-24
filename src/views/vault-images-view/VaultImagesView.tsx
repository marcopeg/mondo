import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventRef, TFile } from "obsidian";
import { Typography } from "@/components/ui/Typography";
import { useApp } from "@/hooks/use-app";
import { isImageFile } from "@/utils/fileTypeFilters";

type ImageEntry = {
  file: TFile;
  resourcePath: string;
};

export const VaultImagesView = () => {
  const app = useApp();
  const [files, setFiles] = useState<TFile[]>([]);

  const collect = useCallback(() => {
    const images = app.vault
      .getFiles()
      .filter((file) => isImageFile(file))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    setFiles(images);
  }, [app]);

  useEffect(() => {
    collect();

    const refs: EventRef[] = [];
    const handleChange = () => {
      collect();
    };

    refs.push(app.vault.on("create", handleChange));
    refs.push(app.vault.on("delete", handleChange));
    refs.push(app.vault.on("modify", handleChange));
    refs.push(app.vault.on("rename", handleChange));

    return () => {
      for (const ref of refs) {
        try {
          app.vault.offref(ref);
        } catch (error) {
          console.debug("VaultImagesView: failed to remove vault listener", error);
        }
      }
    };
  }, [app, collect]);

  const entries = useMemo((): ImageEntry[] => {
    const resourceMap = new Map<string, string>();

    return files.map((file) => {
      let resource = resourceMap.get(file.path);
      if (!resource) {
        resource = app.vault.getResourcePath(file);
        resourceMap.set(file.path, resource);
      }

      return {
        file,
        resourcePath: resource,
      };
    });
  }, [app, files]);

  const handleOpenFile = useCallback(
    async (file: TFile) => {
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(file);
    },
    [app]
  );

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">Vault Images</Typography>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-[var(--text-muted)]">
          No images found in your vault.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map((entry) => (
            <button
              key={entry.file.path}
              type="button"
              className="group relative aspect-square overflow-hidden rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)]"
              onClick={() => {
                void handleOpenFile(entry.file);
              }}
              title={entry.file.basename}
            >
              <img
                src={entry.resourcePath}
                alt={entry.file.basename}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-transparent p-2">
                <span className="truncate text-left text-xs font-medium text-white">
                  {entry.file.basename}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultImagesView;
