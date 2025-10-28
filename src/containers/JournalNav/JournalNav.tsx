import React from "react";
import Stack from "@/components/ui/Stack";
import Button from "@/components/ui/Button";
import Paper from "@/components/ui/Paper";
import useJournalEntry from "@/hooks/use-journal-entry";
import { useSetting } from "@/hooks/use-setting";
import { useApp } from "@/hooks/use-app";
import { openJournal } from "@/commands/journal.open";

export const JournalNav: React.FC = () => {
  const { current, prev, next } = useJournalEntry();
  const app = useApp();

  const openFile = (path: string) => {
    try {
      const leaf = app.workspace.getLeaf(false);
      if (leaf) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file && (leaf as any).openFile) {
          (leaf as any).openFile(file);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const formatDate = (d: Date, format: string) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return format
      .replace(/YYYY/g, String(d.getFullYear()))
      .replace(/MM/g, pad(d.getMonth() + 1))
      .replace(/DD/g, pad(d.getDate()));
  };

  const onPrev = () => {
    if (prev) openFile(prev.file.path);
  };

  const onNext = () => {
    if (next) openFile(next.file.path);
  };

  const onToday = async () => {
    const pluginInstance = (app as any).plugins?.plugins?.["mondo"] as any;
    if (pluginInstance && typeof openJournal === "function") {
      try {
        await openJournal(app, pluginInstance);
        return;
      } catch (e) {
        // fallback to command
      }
    }

    try {
      (app as any).commands.executeCommandById("mondo-open-journal");
    } catch (e) {
      // ignore
    }
  };

  return (
    <Paper>
      <Stack align="center" gap={4} className="items-center" mx={8}>
        <Button
          icon="chevron-left"
          iconPosition="start"
          className="mod-cta"
          onClick={onPrev}
          disabled={!prev}
        >
          Prev entry
        </Button>

        <div className="flex-1" />

        <Button className="mod-cta" onClick={onToday}>
          Today
        </Button>

        <div className="flex-1" />

        <Button
          icon="chevron-right"
          iconPosition="end"
          className="mod-cta"
          onClick={onNext}
        >
          Next entry
        </Button>
      </Stack>
    </Paper>
  );
};

export default JournalNav;
