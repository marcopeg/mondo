import { useCallback } from "react";
import { TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";

interface CRMFileLinkProps {
  path: string;
  label: string;
}

export const CRMFileLink = ({ path, label }: CRMFileLinkProps) => {
  const app = useApp();

  const handleOpen = useCallback(async () => {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file || !(file instanceof TFile)) {
      console.warn(`CRMFileLink: Could not find file at path "${path}"`);
      return;
    }

    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
    app.workspace.revealLeaf(leaf);
  }, [app, path]);

  return (
    <Button
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleOpen();
      }}
      variant="link"
      className="text-sm"
    >
      {label}
    </Button>
  );
};
