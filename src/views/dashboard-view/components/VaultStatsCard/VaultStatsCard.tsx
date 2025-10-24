import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Typography } from "@/components/ui/Typography";
import { useVaultStats } from "./useVaultStats";
import { useApp } from "@/hooks/use-app";
import { formatBytes } from "@/utils/formatBytes";
import {
  OPEN_AUDIO_NOTES_COMMAND_ID,
} from "@/views/audio-logs-view/constants";
import { OPEN_VAULT_IMAGES_COMMAND_ID } from "@/views/vault-images-view/constants";
import { OPEN_VAULT_FILES_COMMAND_ID } from "@/views/vault-files-view/constants";
import { OPEN_VAULT_NOTES_COMMAND_ID } from "@/views/vault-notes-view/constants";

const formatter = new Intl.NumberFormat();

type VaultStatsItem = {
  key: string;
  label: string;
  count: number;
  size: number;
  commandId?: string;
};

export const VaultStatsCard = () => {
  const app = useApp();
  const stats = useVaultStats();

  const items = useMemo(
    (): VaultStatsItem[] =>
      [
        {
          key: "notes",
          label: "Notes",
          count: stats.notes.count,
          size: stats.notes.size,
          commandId: OPEN_VAULT_NOTES_COMMAND_ID,
        },
        {
          key: "images",
          label: "Images",
          count: stats.images.count,
          size: stats.images.size,
          commandId: OPEN_VAULT_IMAGES_COMMAND_ID,
        },
        {
          key: "audio",
          label: "Audio",
          count: stats.audio.count,
          size: stats.audio.size,
          commandId: OPEN_AUDIO_NOTES_COMMAND_ID,
        },
        {
          key: "files",
          label: "Files",
          count: stats.files.count,
          size: stats.files.size,
          commandId: OPEN_VAULT_FILES_COMMAND_ID,
        },
      ],
    [stats]
  );

  const handleActivate = (commandId?: string) => {
    if (!commandId) {
      return;
    }

    try {
      (app as any).commands.executeCommandById(commandId);
    } catch (error) {
      console.debug("VaultStatsCard: failed to execute command", error);
    }
  };

  return (
    <Card spacing={6}>
      <Typography
        as="div"
        className="mb-6 text-center text-sm font-medium text-[var(--text-muted)]"
        variant="body"
      >
        Total size • {formatBytes(stats.totalSize)}
      </Typography>
      <div className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => handleActivate(item.commandId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleActivate(item.commandId);
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-transparent p-4 transition-colors hover:border-[var(--background-modifier-border)] hover:bg-[var(--background-modifier-hover)] focus:border-[var(--background-modifier-border)] focus:bg-[var(--background-modifier-hover)] focus:outline-none"
          >
            <Typography
              as="div"
              className="text-lg font-semibold text-[var(--text-normal)]"
              variant="body"
            >
              {formatter.format(item.count)} {item.label}
            </Typography>
            <div className="h-px w-12 bg-[var(--background-modifier-border)]" />
            <Typography as="div" className="text-sm" variant="muted">
              {formatBytes(item.size)}
            </Typography>
          </div>
        ))}
      </div>
    </Card>
  );
};
