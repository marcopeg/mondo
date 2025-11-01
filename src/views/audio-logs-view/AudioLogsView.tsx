import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Mondo from "@/main";
import { useApp } from "@/hooks/use-app";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { ReadableDate } from "@/components/ui/ReadableDate";
import { AUDIO_FILE_EXTENSIONS } from "@/utils/AudioTranscriptionManager";
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

const extractNoteSnippet = (content: string) => {
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

const extractNoteTitle = (app: App, file: TFile) => {
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter ?? {};
  const showField = frontmatter?.show;

  if (typeof showField === "string") {
    const trimmed = showField.trim();

    if (trimmed) {
      const match = trimmed.match(/^\[\[(.+?)(?:\|.*?)?\]\]$/);
      if (match?.[1]) {
        return match[1].trim() || null;
      }

      return trimmed;
    }
  }

  return file.basename || file.name || null;
};

const openFileInWorkspace = async (app: App, file: TFile) => {
  try {
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
  } catch (error) {
    console.error("Mondo Audio Logs: failed to open file", error);
  }
};

type AudioMetadata = {
  transcription: {
    file: TFile | null;
    title: string | null;
    snippet: string | null;
    hasLoadedSnippet: boolean;
  };
  voiceoverSource: {
    file: TFile | null;
    title: string | null;
    snippet: string | null;
    hasLoadedSnippet: boolean;
  };
  version: number;
  isResolved: boolean;
};

type MetadataMap = Record<string, AudioMetadata>;

type AudioLogsViewProps = {
  plugin: Mondo;
};

export const AudioLogsView = ({ plugin }: AudioLogsViewProps) => {
  const app = useApp();
  const manager = plugin.getAudioTranscriptionManager();
  const [audioFiles, setAudioFiles] = useState<TFile[]>([]);
  const [transcriptionFiles, setTranscriptionFiles] = useState<TFile[]>([]);
  const [voiceoverSourceFiles, setVoiceoverSourceFiles] = useState<TFile[]>([]);
  const [metadataVersion, setMetadataVersion] = useState(0);
  const [metadataMap, setMetadataMap] = useState<MetadataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const metadataMapRef = useRef<MetadataMap>({});

  useEffect(() => {
    metadataMapRef.current = metadataMap;
  }, [metadataMap]);

  const audioFileLookup = useMemo(() => {
    const map = new Map<string, TFile>();

    const register = (key: string | null | undefined, file: TFile) => {
      if (!key) {
        return;
      }

      const normalized = key.trim().toLowerCase();
      if (!normalized || map.has(normalized)) {
        return;
      }

      map.set(normalized, file);
    };

    audioFiles.forEach((file) => {
      register(file.path, file);
      register(file.name, file);
      register(file.basename, file);
    });

    return map;
  }, [audioFiles]);

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

  const refreshNoteAssociations = useCallback(() => {
    const markdownFiles = app.vault.getMarkdownFiles();
    const transcriptions: TFile[] = [];
    const voiceoverSources: TFile[] = [];

    markdownFiles.forEach((file) => {
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};
      const type = typeof frontmatter?.type === "string"
        ? frontmatter.type.trim().toLowerCase()
        : "";

      if (isTranscriptionFile(file) || type === "transcription") {
        transcriptions.push(file);
      }

      if (frontmatter?.voiceover != null) {
        voiceoverSources.push(file);
      }
    });

    setTranscriptionFiles(transcriptions);
    setVoiceoverSourceFiles(voiceoverSources);
  }, [app]);

  const bumpMetadataVersion = useCallback(() => {
    setMetadataVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    refreshAudioFiles();
    refreshNoteAssociations();
  }, [refreshAudioFiles, refreshNoteAssociations]);

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

      if (isTranscriptionFile(abstract) || abstract.extension === "md") {
        refreshNoteAssociations();
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

      if (isTranscriptionFile(abstract) || abstract.extension === "md") {
        refreshNoteAssociations();
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

      if (isTranscriptionFile(abstract) || abstract.extension === "md") {
        refreshNoteAssociations();
        bumpMetadataVersion();
      }
    };

    const handleRename = (file: TAbstractFile, oldPath: string) => {
      if (!(file instanceof TFile)) {
        if (hasAudioExtension(oldPath)) {
          refreshAudioFiles();
          bumpMetadataVersion();
        }

        if (isTranscriptionFile(oldPath) || oldPath.toLowerCase().endsWith(".md")) {
          refreshNoteAssociations();
          bumpMetadataVersion();
        }

        return;
      }

      if (isAudioFile(file) || hasAudioExtension(oldPath)) {
        refreshAudioFiles();
        bumpMetadataVersion();
      }

      if (
        isTranscriptionFile(file) ||
        isTranscriptionFile(oldPath) ||
        file.extension === "md"
      ) {
        refreshNoteAssociations();
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
  }, [
    app,
    bumpMetadataVersion,
    refreshAudioFiles,
    refreshNoteAssociations,
  ]);

  useEffect(() => {
    setMetadataMap((prev) => {
      const next: MetadataMap = {};
      audioFiles.forEach((file) => {
        const meta = prev[file.path];
        if (meta) {
          next[file.path] = meta;
        }
      });
      metadataMapRef.current = next;
      return next;
    });
  }, [audioFiles]);

  

  const findAudioFileByReference = useCallback(
    (noteFile: TFile, value: unknown) => {
      const entries = Array.isArray(value) ? value : [value];
      const values: string[] = [];

      entries.forEach((entry) => {
        if (typeof entry === "string") {
          values.push(entry);
          return;
        }

        if (entry && typeof entry === "object") {
          const pathValue = (entry as { path?: unknown }).path;
          if (typeof pathValue === "string") {
            values.push(pathValue);
          }
        }
      });

      for (const raw of values) {
        const trimmed = raw.trim();

        if (!trimmed) {
          continue;
        }

        const candidates = new Set<string>();
        candidates.add(trimmed);

        const match = trimmed.match(/^\[\[(.+?)\]\]$/);
        if (match?.[1]) {
          const [target] = match[1].split("|");
          if (target?.trim()) {
            candidates.add(target.trim());
          }
        }

        for (const candidate of candidates) {
          const normalized = candidate.toLowerCase();
          const direct = audioFileLookup.get(normalized);
          if (direct) {
            return direct;
          }

          const resolved = app.metadataCache.getFirstLinkpathDest(
            candidate,
            noteFile.path
          );
          if (resolved instanceof TFile && isAudioFile(resolved)) {
            return resolved;
          }

          const absolute = app.vault.getAbstractFileByPath(candidate);
          if (absolute instanceof TFile && isAudioFile(absolute)) {
            return absolute;
          }

          const relativeCandidate = noteFile.parent?.path
            ? `${noteFile.parent.path}/${candidate}`
            : candidate;

          const relativeMatch = audioFileLookup.get(relativeCandidate.toLowerCase());
          if (relativeMatch) {
            return relativeMatch;
          }

          const relativeFile = app.vault.getAbstractFileByPath(relativeCandidate);
          if (relativeFile instanceof TFile && isAudioFile(relativeFile)) {
            return relativeFile;
          }

          if (!candidate.includes(".")) {
            for (const extension of AUDIO_FILE_EXTENSIONS) {
              const withExt = `${candidate}.${extension}`;
              const withExtMatch = audioFileLookup.get(withExt.toLowerCase());
              if (withExtMatch) {
                return withExtMatch;
              }

              const relativeWithExt = noteFile.parent?.path
                ? `${noteFile.parent.path}/${withExt}`
                : withExt;

              const relativeWithExtMatch = audioFileLookup.get(
                relativeWithExt.toLowerCase()
              );
              if (relativeWithExtMatch) {
                return relativeWithExtMatch;
              }

              const absoluteWithExt = app.vault.getAbstractFileByPath(withExt);
              if (absoluteWithExt instanceof TFile && isAudioFile(absoluteWithExt)) {
                return absoluteWithExt;
              }

              const relativeAbsolute = app.vault.getAbstractFileByPath(
                relativeWithExt
              );
              if (relativeAbsolute instanceof TFile && isAudioFile(relativeAbsolute)) {
                return relativeAbsolute;
              }
            }
          }
        }
      }

      return null;
    },
    [app.metadataCache, app.vault, audioFileLookup]
  );

  const findAudioFileForTranscription = useCallback(
    (file: TFile) => {
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};

      const fromSource = findAudioFileByReference(file, frontmatter?.source);
      if (fromSource) {
        return fromSource;
      }

      const fromAudio = findAudioFileByReference(file, frontmatter?.audio);
      if (fromAudio) {
        return fromAudio;
      }

      const baseName = file.basename.replace(/-transcription$/, "").trim();
      if (!baseName) {
        return null;
      }

      const baseMatch = audioFileLookup.get(baseName.toLowerCase());
      if (baseMatch) {
        return baseMatch;
      }

      const parentPath = file.parent?.path ?? "";
      if (parentPath) {
        const relativeKey = `${parentPath}/${baseName}`.toLowerCase();
        const relativeMatch = audioFileLookup.get(relativeKey);
        if (relativeMatch) {
          return relativeMatch;
        }
      }

      for (const extension of AUDIO_FILE_EXTENSIONS) {
        const candidateName = `${baseName}.${extension}`;
        const directMatch = audioFileLookup.get(candidateName.toLowerCase());
        if (directMatch) {
          return directMatch;
        }

        const relativeCandidate = parentPath
          ? `${parentPath}/${candidateName}`
          : candidateName;
        const relativeMatch = audioFileLookup.get(relativeCandidate.toLowerCase());
        if (relativeMatch) {
          return relativeMatch;
        }

        const abstract = app.vault.getAbstractFileByPath(relativeCandidate);
        if (abstract instanceof TFile && isAudioFile(abstract)) {
          return abstract;
        }
      }

      return null;
    },
    [
      app.metadataCache,
      app.vault,
      audioFileLookup,
      findAudioFileByReference,
    ]
  );

  const transcriptionsMap = useMemo(() => {
    const map = new Map<string, TFile>();

    transcriptionFiles.forEach((file) => {
      const audioFile = findAudioFileForTranscription(file);
      if (audioFile && !map.has(audioFile.path)) {
        map.set(audioFile.path, file);
      }
    });

    return map;
  }, [findAudioFileForTranscription, transcriptionFiles]);

  const voiceoverSourcesMap = useMemo(() => {
    const map = new Map<string, TFile>();

    voiceoverSourceFiles.forEach((file) => {
      const cache = app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};
      const voiceoverFile = findAudioFileByReference(file, frontmatter?.voiceover);

      if (voiceoverFile && !map.has(voiceoverFile.path)) {
        map.set(voiceoverFile.path, file);
      }
    });

    return map;
  }, [app.metadataCache, findAudioFileByReference, voiceoverSourceFiles]);

  const visibleFiles = useMemo(
    () => audioFiles.slice(0, visibleCount),
    [audioFiles, visibleCount]
  );

  useEffect(() => {
    if (!manager) {
      metadataMapRef.current = {};
      setMetadataMap({});
      setIsLoading(false);
      return;
    }

    if (visibleFiles.length === 0) {
      setIsLoading(false);
      return;
    }

    const currentVersion = metadataVersion;
    const updates: MetadataMap = {};
    const pendingFiles: TFile[] = [];

    visibleFiles.forEach((file) => {
      const existing = metadataMapRef.current[file.path];
      const transcriptionFile = transcriptionsMap.get(file.path) ?? null;
      const voiceoverFile = voiceoverSourcesMap.get(file.path) ?? null;

      const previousTranscriptionPath = existing?.transcription.file?.path ?? null;
      const previousVoiceoverPath = existing?.voiceoverSource.file?.path ?? null;

      const transcriptionChanged =
        (transcriptionFile?.path ?? null) !== previousTranscriptionPath;
      const voiceoverChanged =
        (voiceoverFile?.path ?? null) !== previousVoiceoverPath;
      const versionChanged = existing?.version !== currentVersion;
      const needsRefresh =
        !existing || versionChanged || transcriptionChanged || voiceoverChanged;

      const transcriptionTitle = transcriptionFile
        ? extractNoteTitle(app, transcriptionFile)
        : null;
      const voiceoverTitle = voiceoverFile ? extractNoteTitle(app, voiceoverFile) : null;

      const metadata: AudioMetadata = {
        transcription: transcriptionFile
          ? {
              file: transcriptionFile,
              title: transcriptionTitle,
              snippet:
                !needsRefresh && !transcriptionChanged
                  ? existing?.transcription.snippet ?? null
                  : null,
              hasLoadedSnippet:
                !needsRefresh && !transcriptionChanged
                  ? existing?.transcription.hasLoadedSnippet ?? false
                  : false,
            }
          : {
              file: null,
              title: null,
              snippet: null,
              hasLoadedSnippet: true,
            },
        voiceoverSource: voiceoverFile
          ? {
              file: voiceoverFile,
              title: voiceoverTitle,
              snippet:
                !needsRefresh && !voiceoverChanged
                  ? existing?.voiceoverSource.snippet ?? null
                  : null,
              hasLoadedSnippet:
                !needsRefresh && !voiceoverChanged
                  ? existing?.voiceoverSource.hasLoadedSnippet ?? false
                  : false,
            }
          : {
              file: null,
              title: null,
              snippet: null,
              hasLoadedSnippet: true,
            },
        version: currentVersion,
        isResolved:
          (!transcriptionFile && !voiceoverFile) ||
          (!needsRefresh &&
            existing?.isResolved === true &&
            (!transcriptionFile ||
              existing?.transcription.hasLoadedSnippet === true) &&
            (!voiceoverFile ||
              existing?.voiceoverSource.hasLoadedSnippet === true)),
      };

      updates[file.path] = metadata;

      const needsTranscriptionSnippet =
        Boolean(metadata.transcription.file) && !metadata.transcription.hasLoadedSnippet;
      const needsVoiceoverSnippet =
        Boolean(metadata.voiceoverSource.file) && !metadata.voiceoverSource.hasLoadedSnippet;

      if (needsRefresh || needsTranscriptionSnippet || needsVoiceoverSnippet) {
        pendingFiles.push(file);
      }
    });

    setMetadataMap((prev) => {
      const next = { ...prev, ...updates };
      metadataMapRef.current = next;
      return next;
    });

    if (pendingFiles.length === 0) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);

    const run = async () => {
      for (const file of pendingFiles) {
        if (cancelled) {
          break;
        }

        const current = metadataMapRef.current[file.path];
        if (!current) {
          continue;
        }

        const nextMeta: AudioMetadata = {
          ...current,
          transcription: current.transcription,
          voiceoverSource: current.voiceoverSource,
        };

        const transcriptionFile = current.transcription.file;
        if (transcriptionFile && !current.transcription.hasLoadedSnippet) {
          try {
            const content = await app.vault.cachedRead(transcriptionFile);
            const snippet = extractNoteSnippet(content);
            nextMeta.transcription = {
              ...current.transcription,
              title: current.transcription.title ?? extractNoteTitle(app, transcriptionFile),
              snippet,
              hasLoadedSnippet: true,
            };
          } catch (error) {
            console.warn(
              "Mondo Audio Logs: failed to read transcription note",
              error
            );
            nextMeta.transcription = {
              ...current.transcription,
              hasLoadedSnippet: true,
            };
          }
        }

        if (cancelled) {
          break;
        }

        const voiceoverFile = current.voiceoverSource.file;
        if (voiceoverFile && !current.voiceoverSource.hasLoadedSnippet) {
          try {
            const content = await app.vault.cachedRead(voiceoverFile);
            const snippet = extractNoteSnippet(content);
            nextMeta.voiceoverSource = {
              ...current.voiceoverSource,
              title: current.voiceoverSource.title ?? extractNoteTitle(app, voiceoverFile),
              snippet,
              hasLoadedSnippet: true,
            };
          } catch (error) {
            console.warn(
              "Mondo Audio Logs: failed to read voiceover source note",
              error
            );
            nextMeta.voiceoverSource = {
              ...current.voiceoverSource,
              hasLoadedSnippet: true,
            };
          }
        }

        nextMeta.version = currentVersion;
        nextMeta.isResolved =
          (!nextMeta.transcription.file && !nextMeta.voiceoverSource.file) ||
          ((!nextMeta.transcription.file ||
            nextMeta.transcription.hasLoadedSnippet) &&
            (!nextMeta.voiceoverSource.file ||
              nextMeta.voiceoverSource.hasLoadedSnippet));

        setMetadataMap((prev) => {
          if (cancelled) {
            return prev;
          }
          const existingMeta = prev[file.path];
          if (!existingMeta) {
            return prev;
          }
          const merged: AudioMetadata = {
            ...existingMeta,
            transcription: nextMeta.transcription,
            voiceoverSource: nextMeta.voiceoverSource,
            version: currentVersion,
            isResolved: nextMeta.isResolved,
          };
          const next = { ...prev, [file.path]: merged };
          metadataMapRef.current = next;
          return next;
        });
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    app,
    app.vault,
    manager,
    metadataVersion,
    transcriptionsMap,
    voiceoverSourcesMap,
    visibleFiles,
  ]);

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
        console.error("Mondo Audio Logs: failed to play audio", error);
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
        refreshNoteAssociations();
        bumpMetadataVersion();
      } finally {
        setTranscribing((prev) => ({ ...prev, [file.path]: false }));
      }
    },
    [bumpMetadataVersion, manager, refreshNoteAssociations]
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
        console.error("Mondo Audio Logs: failed to delete audio file", error);
        return;
      }

      if (transcriptionFile) {
        try {
          await app.vault.delete(transcriptionFile);
        } catch (error) {
          console.error(
            "Mondo Audio Logs: failed to delete transcription note",
            error
          );
        }
      }
    },
    [app.vault, handleStopPlayback, manager]
  );

  const totals = useMemo(() => {
    const totalSize = audioFiles.reduce((sum, file) => sum + file.stat.size, 0);
    return {
      totalSize,
      totalNotes: audioFiles.length,
    };
  }, [audioFiles]);

  const rows = useMemo(
    () =>
      visibleFiles.map((file) => {
        const meta = metadataMap[file.path];
        const sizeLabel = formatFileSize(file.stat.size);
        const dateValue = file.stat.mtime;
        const transcription = meta?.transcription ?? {
          file: null,
          title: null,
          snippet: null,
          hasLoadedSnippet: true,
        };
        const voiceoverSource = meta?.voiceoverSource ?? {
          file: null,
          title: null,
          snippet: null,
          hasLoadedSnippet: true,
        };
        const transcriptionLabel =
          transcription.snippet ??
          transcription.title ??
          transcription.file?.basename ??
          null;
        const voiceoverLabel =
          voiceoverSource.snippet ??
          voiceoverSource.title ??
          voiceoverSource.file?.basename ??
          null;
        const transcriptionTooltip =
          transcription.snippet ??
          transcription.title ??
          transcription.file?.name ??
          null;
        const voiceoverTooltip =
          voiceoverSource.snippet ??
          voiceoverSource.title ??
          voiceoverSource.file?.name ??
          null;
        const hasTranscription = Boolean(transcription.file);
        const hasVoiceoverSource = Boolean(voiceoverSource.file);
        const isResolvingMetadata = meta?.isResolved !== true;
        const displayTitle =
          transcription.title ??
          voiceoverSource.title ??
          transcription.file?.basename ??
          voiceoverSource.file?.basename ??
          file.basename;
        const isTranscribing =
          Boolean(transcribing[file.path]) ||
          manager?.isTranscriptionInProgress(file) === true;

        return {
          file,
          sizeLabel,
          dateValue,
          pathLabel: file.path,
          transcription,
          transcriptionLabel,
          transcriptionTooltip,
          hasTranscription,
          voiceoverSource,
          voiceoverLabel,
          voiceoverTooltip,
          hasVoiceoverSource,
          isTranscribing,
          isResolvingMetadata,
          displayTitle,
          isResolved: meta?.isResolved ?? false,
        };
      }),
    [manager, metadataMap, transcribing, visibleFiles]
  );
  const totalNotesLabel = totals.totalNotes.toLocaleString();
  const totalSizeLabel = formatFileSize(totals.totalSize);

  const hasMore = audioFiles.length > visibleFiles.length;

  const tooltipClasses =
    "pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-[28rem] break-words rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary, var(--background-primary))] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg group-hover:block group-focus-visible:block group-focus-within:block";

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-[var(--background-modifier-border)] pb-3">
        <Typography variant="h1">Audio Notes</Typography>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total Notes
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-normal)]">
            {totalNotesLabel}
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
                  colSpan={6}
                >
                  {isLoading
                    ? "Loading audio notes..."
                    : "No audio notes found."}
                </Table.Cell>
              </tr>
            ) : (
              rows.map((row) => {
                const isPlaying = playingPath === row.file.path;
                const displayTitle = row.displayTitle;
                const isResolving = row.isResolvingMetadata;
                const showResolvingState =
                  !row.hasTranscription &&
                  !row.hasVoiceoverSource &&
                  isResolving;
                const canShowTranscribeButton =
                  !row.hasTranscription &&
                  !row.hasVoiceoverSource &&
                  !isResolving;
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
                      <div className="flex w-full max-w-[28rem] min-w-0 flex-col items-start gap-1">
                        <Button
                          variant="link"
                          tone="info"
                          fullWidth
                          className="group relative overflow-hidden text-left font-medium"
                          onClick={() => {
                            void openFileInWorkspace(app, row.file);
                          }}
                          aria-label={`Open ${displayTitle}`}
                          title={displayTitle ?? undefined}
                        >
                          <span className="block w-full truncate">
                            {displayTitle}
                          </span>
                          {displayTitle ? (
                            <span className={tooltipClasses} role="presentation">
                              {displayTitle}
                            </span>
                          ) : null}
                        </Button>
                        <div
                          className="group relative w-full text-xs text-[var(--text-muted)]"
                          aria-label={row.pathLabel}
                          tabIndex={0}
                          title={row.pathLabel}
                        >
                          <span className="block w-full truncate">
                            {row.pathLabel}
                          </span>
                          <span className={tooltipClasses} role="presentation">
                            {row.pathLabel}
                          </span>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle text-[var(--text-muted)]">
                      <ReadableDate value={row.dateValue} fallback="--" />
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle text-[var(--text-normal)]">
                      {row.sizeLabel}
                    </Table.Cell>
                    <Table.Cell className="p-3 align-middle">
                      {row.hasTranscription || row.hasVoiceoverSource ? (
                        <div className="flex flex-col gap-3">
                          {row.hasTranscription ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Transcription
                              </span>
                              <a
                                href="#"
                                className="block max-w-[22rem] truncate text-[var(--interactive-accent)] hover:underline"
                                onClick={(event) => {
                                  event.preventDefault();
                                  if (row.transcription.file) {
                                    void openFileInWorkspace(app, row.transcription.file);
                                  }
                                }}
                                title={
                                  row.transcriptionTooltip ??
                                  row.transcriptionLabel ??
                                  "Open transcription"
                                }
                              >
                                {row.transcriptionLabel ??
                                  row.transcription.file?.basename ??
                                  "Open transcription"}
                              </a>
                            </div>
                          ) : null}
                          {row.hasVoiceoverSource ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Voiceover Source
                              </span>
                              <a
                                href="#"
                                className="block max-w-[22rem] truncate text-[var(--interactive-accent)] hover:underline"
                                onClick={(event) => {
                                  event.preventDefault();
                                  if (row.voiceoverSource.file) {
                                    void openFileInWorkspace(app, row.voiceoverSource.file);
                                  }
                                }}
                                title={
                                  row.voiceoverTooltip ??
                                  row.voiceoverLabel ??
                                  "Open voiceover source"
                                }
                              >
                                {row.voiceoverLabel ??
                                  row.voiceoverSource.file?.basename ??
                                  "Open voiceover source"}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ) : canShowTranscribeButton ? (
                        <Button
                          icon="wand-2"
                          className="mod-cta"
                          disabled={row.isTranscribing}
                          onClick={() => handleTranscribe(row.file)}
                        >
                          {transcribeLabel}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <Icon name="clock" className="h-4 w-4" />
                          <span className="text-sm">
                            {showResolvingState ? "Resolving..." : "Preparing..."}
                          </span>
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell className="p-3 text-right align-middle">
                      <Button
                        icon="trash"
                        variant="link"
                        tone="danger"
                        aria-label="Delete audio note"
                        onClick={() => {
                          void handleDelete(row.file);
                        }}
                      />
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            onClick={() => setVisibleCount((value) => value + 20)}
            className="mod-cta"
          >
            Load More
          </Button>
        </div>
      ) : null}
    </div>
  );
};
