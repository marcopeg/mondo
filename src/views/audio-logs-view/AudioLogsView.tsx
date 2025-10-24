import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type CRM from "@/main";
import { useApp } from "@/hooks/use-app";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { AUDIO_FILE_EXTENSIONS } from "@/utils/AudioTranscriptionManager";
import {
  AUDIO_LOGS_ICON,
  OPEN_AUDIO_NOTES_COMMAND_ID,
} from "./constants";
import type { App, EventRef, TAbstractFile } from "obsidian";
import { TFile } from "obsidian";

const isAudioFile = (file: TFile) =>
  AUDIO_FILE_EXTENSIONS.has(file.extension.toLowerCase());

const isTranscriptionFile = (fileOrPath: TFile | string) => {
  const path =
    typeof fileOrPath === "string"
      ? fileOrPath
      : fileOrPath.path ?? "";

  return path.toLowerCase().endsWith("-transcription.md");
};

const hasAudioExtension = (value: string) => {
  const normalized = value.includes(".")
    ? value.split(".").pop()?.toLowerCase?.() ?? ""
    : value.toLowerCase();

  return AUDIO_FILE_EXTENSIONS.has(normalized);
};

const formatDate = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
};

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds == null || !Number.isFinite(seconds)) {
    return "--";
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;

  const hh = hours > 0 ? String(hours).padStart(2, "0") : null;
  const mm = String(hours > 0 ? minutes : Math.floor(total / 60)).padStart(
    2,
    "0"
  );
  const ss = String(remaining).padStart(2, "0");

  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
};

const formatFileSize = (size: number | null | undefined) => {
  if (size == null || size <= 0) {
    return "--";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
};

const extractTranscriptionSnippet = (content: string) => {
  const lines = content.split(/\r?\n/);
  let index = 0;

  if (lines[index]?.trim() === "---") {
    index += 1;
    while (index < lines.length && lines[index]?.trim() !== "---") {
      index += 1;
    }
    if (lines[index]?.trim() === "---") {
      index += 1;
    }
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index]?.trim?.() ?? "";
    if (!line) {
      continue;
    }
    if (line.startsWith("![[")) {
      continue;
    }
    return line;
  }

  return null;
};

const openFileInWorkspace = async (app: App, file: TFile) => {
  try {
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
  } catch (error) {
    console.error("CRM Audio Logs: failed to open file", error);
  }
};

type AudioMetadata = {
  durationSeconds: number | null;
  transcriptionFile: TFile | null;
  snippet: string | null;
};

type MetadataMap = Record<string, AudioMetadata>;

type AudioLogsViewProps = {
  plugin: CRM;
};

export const AudioLogsView = ({ plugin }: AudioLogsViewProps) => {
  const app = useApp();
  const manager = plugin.getAudioTranscriptionManager();
  const [audioFiles, setAudioFiles] = useState<TFile[]>([]);
  const [metadataVersion, setMetadataVersion] = useState(0);
  const [metadataMap, setMetadataMap] = useState<MetadataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        setPlayingPath(null);
      });
      audioRef.current.addEventListener("pause", () => {
        if (audioRef.current && audioRef.current.currentTime === 0) {
          setPlayingPath(null);
        }
      });
    }
    return audioRef.current;
  }, []);

  const refreshAudioFiles = useCallback(() => {
    const files = app
      .vault
      .getFiles()
      .filter((file) => isAudioFile(file))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    setAudioFiles(files);
  }, [app]);

  const bumpMetadataVersion = useCallback(() => {
    setMetadataVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    refreshAudioFiles();
  }, [refreshAudioFiles]);

  useEffect(() => {
    const events: EventRef[] = [];

    const handleCreate = (abstract: TAbstractFile) => {
      if (!(abstract instanceof TFile)) {
        return;
      }

      if (isAudioFile(abstract)) {
        refreshAudioFiles();
        bumpMetadataVersion();
        return;
      }

      if (isTranscriptionFile(abstract)) {
        bumpMetadataVersion();
      }
    };

    const handleModify = (abstract: TAbstractFile) => {
      if (!(abstract instanceof TFile)) {
        return;
      }

      if (isAudioFile(abstract)) {
        refreshAudioFiles();
        bumpMetadataVersion();
        return;
      }

      if (isTranscriptionFile(abstract)) {
        bumpMetadataVersion();
      }
    };

    const handleDelete = (abstract: TAbstractFile) => {
      if (!(abstract instanceof TFile)) {
        return;
      }

      if (isAudioFile(abstract)) {
        refreshAudioFiles();
        bumpMetadataVersion();
        return;
      }

      if (isTranscriptionFile(abstract)) {
        bumpMetadataVersion();
      }
    };

    const handleRename = (file: TAbstractFile, oldPath: string) => {
      if (!(file instanceof TFile)) {
        if (hasAudioExtension(oldPath)) {
          refreshAudioFiles();
          bumpMetadataVersion();
        }

        if (isTranscriptionFile(oldPath)) {
          bumpMetadataVersion();
        }

        return;
      }

      if (isAudioFile(file) || hasAudioExtension(oldPath)) {
        refreshAudioFiles();
        bumpMetadataVersion();
      }

      if (isTranscriptionFile(file) || isTranscriptionFile(oldPath)) {
        bumpMetadataVersion();
      }
    };

    events.push(app.vault.on("create", handleCreate));
    events.push(app.vault.on("modify", handleModify));
    events.push(app.vault.on("delete", handleDelete));
    events.push(app.vault.on("rename", handleRename));

    return () => {
      events.forEach((ref) => app.vault.offref(ref));
    };
  }, [app, bumpMetadataVersion, refreshAudioFiles]);

  useEffect(() => {
    let disposed = false;

    const loadMetadata = async () => {
      if (!manager) {
        setMetadataMap({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const entries = await Promise.all(
        audioFiles.map(async (file) => {
          try {
            const duration = await manager.getAudioDurationSeconds(file);
            const transcriptionFile = manager.getTranscriptionNoteFile(file);
            let snippet: string | null = null;

            if (transcriptionFile) {
              try {
                const content = await app.vault.cachedRead(transcriptionFile);
                snippet = extractTranscriptionSnippet(content);
              } catch (error) {
                console.warn(
                  "CRM Audio Logs: failed to read transcription note",
                  error
                );
              }
            }

            return [
              file.path,
              {
                durationSeconds: duration ?? null,
                transcriptionFile,
                snippet,
              } as AudioMetadata,
            ] as const;
          } catch (error) {
            console.warn(
              "CRM Audio Logs: failed to load audio metadata",
              file.path,
              error
            );
            const transcriptionFile = manager.getTranscriptionNoteFile(file);
            return [
              file.path,
              {
                durationSeconds: null,
                transcriptionFile,
                snippet: null,
              } as AudioMetadata,
            ] as const;
          }
        })
      );

      if (!disposed) {
        setMetadataMap(Object.fromEntries(entries));
        setIsLoading(false);
      }
    };

    void loadMetadata();

    return () => {
      disposed = true;
    };
  }, [app, audioFiles, manager, metadataVersion]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
      }
    };
  }, []);

  const handleTogglePlayback = useCallback(
    async (file: TFile) => {
      const audio = ensureAudioElement();

      if (playingPath === file.path) {
        audio.pause();
        audio.currentTime = 0;
        setPlayingPath(null);
        return;
      }

      const resourcePath = app.vault.getResourcePath(file);

      if (!resourcePath) {
        return;
      }

      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = resourcePath;
        await audio.play();
        setPlayingPath(file.path);
      } catch (error) {
        console.error("CRM Audio Logs: failed to play audio", error);
        setPlayingPath(null);
      }
    },
    [app, ensureAudioElement, playingPath]
  );

  const handleStopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setPlayingPath(null);
  }, []);

  const handleTranscribe = useCallback(
    async (file: TFile) => {
      if (!manager) {
        return;
      }

      setTranscribing((prev) => ({ ...prev, [file.path]: true }));

      try {
        await manager.transcribeAudioFile(file, file.path);
      } finally {
        setTranscribing((prev) => ({ ...prev, [file.path]: false }));
      }
    },
    [manager]
  );

  const handleDelete = useCallback(
    async (file: TFile) => {
      const transcriptionFile = manager?.getTranscriptionNoteFile(file) ?? null;
      const confirmed = window.confirm(
        "Delete the audio file and its transcription? This cannot be undone."
      );

      if (!confirmed) {
        return;
      }

      handleStopPlayback();

      try {
        await app.vault.delete(file);
      } catch (error) {
        console.error("CRM Audio Logs: failed to delete audio file", error);
        return;
      }

      if (transcriptionFile) {
        try {
          await app.vault.delete(transcriptionFile);
        } catch (error) {
          console.error(
            "CRM Audio Logs: failed to delete transcription note",
            error
          );
        }
      }
    },
    [app.vault, handleStopPlayback, manager]
  );

  const totals = useMemo(() => {
    const totalSize = audioFiles.reduce((sum, file) => sum + file.stat.size, 0);
    const totalDuration = audioFiles.reduce((sum, file) => {
      const meta = metadataMap[file.path];
      return sum + (meta?.durationSeconds ?? 0);
    }, 0);

    const hasAnyDurationMissing = audioFiles.some((file) => {
      const meta = metadataMap[file.path];
      return !meta || meta.durationSeconds == null;
    });

    return {
      totalSize,
      totalDuration: hasAnyDurationMissing ? null : totalDuration,
    };
  }, [audioFiles, metadataMap]);

  const rows = useMemo(
    () =>
      audioFiles.map((file) => {
        const meta = metadataMap[file.path];
        const durationLabel = formatDuration(meta?.durationSeconds);
        const sizeLabel = formatFileSize(file.stat.size);
        const dateLabel = formatDate(file.stat.mtime);
        const snippet = meta?.snippet ?? null;
        const transcriptionFile = meta?.transcriptionFile ?? null;
        const isTranscribing =
          Boolean(transcribing[file.path]) ||
          manager?.isTranscriptionInProgress(file) === true;
        const isMatchingTranscription = !meta && isLoading;

        return {
          file,
          durationLabel,
          sizeLabel,
          dateLabel,
          snippet,
          transcriptionFile,
          isTranscribing,
          isMatchingTranscription,
        };
      }),
    [audioFiles, isLoading, manager, metadataMap, transcribing]
  );

  const totalDurationLabel = totals.totalDuration
    ? formatDuration(totals.totalDuration)
    : "--";
  const totalSizeLabel = formatFileSize(totals.totalSize);

  const handleOpenAudioLogs = useCallback(() => {
    (app as any).commands.executeCommandById(OPEN_AUDIO_NOTES_COMMAND_ID);
  }, [app]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Typography variant="h1">Audio Logs</Typography>
        <Button
          icon={AUDIO_LOGS_ICON}
          className="border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[var(--text-normal)] hover:bg-[var(--background-secondary-alt, var(--background-secondary))]"
          onClick={handleOpenAudioLogs}
        >
          OpenAudioNotes
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total Duration
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totalDurationLabel}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total File Size
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totalSizeLabel}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--background-modifier-border)]">
        <Table>
          <thead className="bg-[var(--background-secondary-alt, var(--background-secondary))]">
            <tr>
              <Table.HeadCell className="w-12 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Play
              </Table.HeadCell>
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Title
              </Table.HeadCell>
              <Table.HeadCell className="w-48 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Date
              </Table.HeadCell>
              <Table.HeadCell className="w-24 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Duration
              </Table.HeadCell>
              <Table.HeadCell className="w-24 p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Size
              </Table.HeadCell>
              <Table.HeadCell className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Transcription
              </Table.HeadCell>
              <Table.HeadCell className="w-16 p-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Actions
              </Table.HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Table.Cell
                  className="p-6 text-center text-[var(--text-muted)]"
                  colSpan={7}
                >
                  {isLoading
                    ? "Loading audio notes..."
                    : "No audio notes found."}
                </Table.Cell>
              </tr>
            ) : (
              rows.map((row) => {
                const isPlaying = playingPath === row.file.path;
                const transcribeLabel = row.isTranscribing
                  ? "Transcribing..."
                  : "Transcribe";

                return (
                  <Table.Row key={row.file.path} className="border-t border-[var(--background-modifier-border)]">
                    <Table.Cell className="p-3">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[var(--text-normal)] hover:bg-[var(--background-secondary-alt, var(--background-secondary))]"
                        onClick={() => handleTogglePlayback(row.file)}
                        aria-label={isPlaying ? "Stop playback" : "Play audio"}
                      >
                        <Icon name={isPlaying ? "square" : "play"} className="m-0" />
                      </button>
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle">
                      <a
                        href="#"
                        className="block max-w-[22rem] truncate text-[var(--interactive-accent)] hover:underline"
                        onClick={(event) => {
                          event.preventDefault();
                          void openFileInWorkspace(app, row.file);
                        }}
                        title={row.file.basename}
                      >
                        {row.file.basename}
                      </a>
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle text-[var(--text-muted)]">
                      {row.dateLabel}
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle text-[var(--text-normal)]">
                      {row.durationLabel}
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle text-[var(--text-normal)]">
                      {row.sizeLabel}
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle">
                      {row.isMatchingTranscription ? (
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Matching...</span>
                        </div>
                      ) : row.transcriptionFile ? (
                        <a
                          href="#"
                          className="block max-w-[22rem] truncate text-[var(--interactive-accent)] hover:underline"
                          onClick={(event) => {
                            event.preventDefault();
                            void openFileInWorkspace(app, row.transcriptionFile as TFile);
                          }}
                          title={row.snippet ?? "View transcription"}
                        >
                          {row.snippet ?? "View transcription"}
                        </a>
                      ) : (
                        <Button
                          icon="wand-2"
                          className="mod-cta"
                          disabled={row.isTranscribing}
                          onClick={() => handleTranscribe(row.file)}
                        >
                          {transcribeLabel}
                        </Button>
                      )}
                    </Table.Cell>
                    <Table.Cell className="p-3 text-right align-middle">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--text-muted)] hover:text-[var(--color-red, #d94848)]"
                        onClick={() => handleDelete(row.file)}
                        aria-label="Delete audio note"
                      >
                        <Icon name="trash-2" className="m-0" />
                      </button>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
