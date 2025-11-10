import {
  type App,
  MarkdownView,
  Plugin,
  Menu,
  Notice,
  Platform,
  TAbstractFile,
  TFile,
  type ViewState,
  type WorkspaceLeaf,
  
} from "obsidian";
import {
  MondoDashboardViewWrapper,
  DASHBOARD_ICON,
  DASHBOARD_VIEW,
} from "@/views/dashboard-view/wrapper";
import { MondoAudioLogsViewWrapper } from "@/views/audio-logs-view/wrapper";
import {
  AUDIO_LOGS_ICON,
  AUDIO_LOGS_VIEW,
} from "@/views/audio-logs-view/constants";
import { MondoVaultImagesViewWrapper } from "@/views/vault-images-view/wrapper";
import {
  VAULT_IMAGES_ICON,
  VAULT_IMAGES_VIEW,
} from "@/views/vault-images-view/constants";
import { MondoVaultFilesViewWrapper } from "@/views/vault-files-view/wrapper";
import {
  VAULT_FILES_ICON,
  VAULT_FILES_VIEW,
} from "@/views/vault-files-view/constants";
import { MondoVaultNotesViewWrapper } from "@/views/vault-notes-view/wrapper";
import {
  VAULT_NOTES_ICON,
  VAULT_NOTES_VIEW,
} from "@/views/vault-notes-view/constants";
import {
  MondoEntityPanelViewWrapper,
  ENTITY_PANEL_VIEW,
  type MondoEntityPanelViewState,
} from "@/views/entity-panel-view/wrapper";
import { MondoInlineViewWrapper } from "@/views/code-block-view/wrapper";
import { SettingsView } from "@/views/settings/SettingsView";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { AudioTranscriptionManager } from "@/utils/AudioTranscriptionManager";
import { VoiceoverManager } from "@/utils/VoiceoverManager";
import { NoteDictationManager } from "@/utils/NoteDictationManager";
import { validateMondoConfig } from "@/utils/MondoConfigManager";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { registerDictationIcon } from "@/utils/registerDictationIcon";
import {
  MondoFileType,
  MONDO_FILE_TYPES,
  getMondoEntityConfig,
  isJournalType,
} from "@/types/MondoFileType";
import {
  MONDO_CONFIG_PRESETS,
  MONDO_ENTITY_TYPES,
  setMondoConfig,
} from "@/entities";
import defaultMondoConfig from "@/mondo-config.json";
import {
  DEFAULT_MONDO_JOURNAL_SETTINGS,
  DEFAULT_MONDO_DAILY_SETTINGS,
} from "@/types/MondoOtherPaths";
import { openJournal } from "@/commands/journal.open";
import { openDailyNote } from "@/commands/daily.open";
import { addDailyLog } from "@/commands/daily.addLog";
import { talkToDaily } from "@/commands/daily.talkToDaily";
import { recordToDaily } from "@/commands/daily.recordToDaily";
import { cleanupDailyHistory } from "@/commands/daily.cleanupHistory";
import { journalMoveFactory } from "@/commands/journal.nav";
import { insertTimestamp } from "@/commands/timestamp.insert";
import { copyNoteText } from "@/commands/note.copyText";
import { openEditWithAI } from "@/commands/note.editWithAI";
import { openMagicPaste } from "@/commands/note.magicPaste";
import { sendToChatGPT } from "@/commands/chatgpt.send";
import { openSelfPersonNote } from "@/commands/self.open";
import { findActiveOrSelectedImageFile } from "@/commands/image.edit";
import { injectJournalNav } from "@/events/inject-journal-nav";
import {
  injectMondoLinks,
  disposeMondoLinkInjections,
} from "@/events/inject-mondo-links";
import {
  injectJournalCloseButton,
  disposeJournalCloseButton,
} from "@/events/inject-journal-close-btn";
import {
  injectPropertyPasteHandler,
  disposePropertyPasteHandlers,
} from "@/events/inject-property-paste";
import { requestGeolocation } from "@/utils/geolocation";
import { buildVoiceoverText } from "@/utils/buildVoiceoverText";
import {
  activateFocusMode,
  deactivateFocusMode,
  isFocusModeActive,
  resetFocusMode,
} from "@/utils/focusMode";
import { createJournalFocusModeHandler, isJournalNote } from "@/utils/journalFocusMode";
import DailyNoteTracker from "@/utils/DailyNoteTracker";
import { TimestampToolbarManager } from "@/utils/TimestampToolbarManager";
import { CopyNoteToolbarManager } from "@/utils/CopyNoteToolbarManager";
import { MagicPasteToolbarManager } from "@/utils/MagicPasteToolbarManager";
import {
  DEFAULT_TIMESTAMP_SETTINGS,
  normalizeTimestampSettings,
} from "@/types/TimestampSettings";
import { getTemplateForType, renderTemplate } from "@/utils/MondoTemplates";
import { slugify, focusAndSelectTitle } from "@/utils/createLinkedNoteHelpers";
import {
  isImageEditSupported,
  openEditImageModal,
} from "@/utils/EditImageModal";
import { sanitizeEntityTypeList } from "@/utils/sanitizeEntityTypeList";
import {
  DEFAULT_EDIT_WITH_AI_MODEL,
  normalizeEditWithAIModel,
} from "@/constants/openAIModels";

const MONDO_ICON = "anchor";

  type PanelOpenOptions = {
    state?: Record<string, unknown>;
    reuseMatching?: (leaf: WorkspaceLeaf) => boolean;
  };

export default class Mondo extends Plugin {
  // Settings shape and defaults
  settings: any = {
    // default rootPaths: map every known Mondo type to '/'
    rootPaths: Object.fromEntries(
      MONDO_FILE_TYPES.map((t) => [String(t), "/"])
    ),
    journal: DEFAULT_MONDO_JOURNAL_SETTINGS,
    daily: DEFAULT_MONDO_DAILY_SETTINGS,
    templates: Object.fromEntries(MONDO_FILE_TYPES.map((t) => [String(t), ""])),
    openAIWhisperApiKey: "",
    openAIVoice: "",
    openAIModel: "gpt-5-nano",
    editWithAIModel: DEFAULT_EDIT_WITH_AI_MODEL,
    openAITranscriptionPolishEnabled: true,
    voiceDictation: {
      showRecordingButton: false,
    },
    voiceoverCachePath: "/voiceover",
    selfPersonPath: "",
    includeFrontmatterInChatGPT: false,
    mondoConfigPresetKey: "",
    mondoConfigJson: "",
    mondoConfigNotePath: "", // deprecated; no longer used
    timestamp: DEFAULT_TIMESTAMP_SETTINGS,
    dashboard: {
      openAtBoot: false,
      forceTab: false,
      enableQuickDaily: false,
      enableQuickTasks: true,
      enableRelevantNotes: true,
      relevantNotesMode: "hits",
      disableStats: true,
      quickSearchEntities: [],
      quickTasksEntities: [],
      collapsedPanels: {},
    },
    ribbonIcons: {
      dashboard: true,
      audioLogs: true,
      vaultImages: true,
      vaultFiles: true,
      vaultNotes: true,
    },
    vaultImages: {
      viewMode: "wall",
    },
  };

  private hasFocusedDashboardOnStartup = false;

  private audioTranscriptionManager: AudioTranscriptionManager | null = null;
  private voiceoverManager: VoiceoverManager | null = null;
  private noteDictationManager: NoteDictationManager | null = null;
  private timestampToolbarManager: TimestampToolbarManager | null = null;
  private copyNoteToolbarManager: CopyNoteToolbarManager | null = null;
  private magicPasteToolbarManager: MagicPasteToolbarManager | null = null;
  private dailyNoteTracker: DailyNoteTracker | null = null;
  private geolocationAbortController: AbortController | null = null;
  private mondoConfigManager: null = null;
  private dashboardRibbonEl: HTMLElement | null = null;
  private audioLogsRibbonEl: HTMLElement | null = null;
  private vaultImagesRibbonEl: HTMLElement | null = null;
  private vaultFilesRibbonEl: HTMLElement | null = null;
  private vaultNotesRibbonEl: HTMLElement | null = null;

  private applyGeolocationToFile = async (
    file: TFile,
    { notify }: { notify: boolean }
  ): Promise<boolean> => {
    this.geolocationAbortController = new AbortController();

    let notice: Notice | null = null;

    try {
      // Show loading indicator using Notice
      notice = new Notice("Getting your location...", 0);

      const geoloc = await requestGeolocation(
        this.geolocationAbortController.signal
      );

      await this.app.fileManager.processFrontMatter(file, (fm) => {
        // Store as strings with dots to ensure international compatibility
        fm.lat = String(geoloc.lat).replace(",", ".");
        fm.lon = String(geoloc.lon).replace(",", ".");
      });

      if (notify) {
        new Notice("Geolocation saved.");
      }

      return true;
    } catch (error) {
      console.error("Mondo: Failed to capture geolocation", error);

      if (notify) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Unable to capture geolocation.";

        // Don't show error if user cancelled
        if (message !== "Geolocation request cancelled.") {
          new Notice(`Geolocation failed: ${message}`);
        }
      }

      return false;
    } finally {
      notice?.hide();
      this.geolocationAbortController = null;
    }
  };

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign(this.settings, data ?? {});

    this.settings.rootPaths = Object.assign(
      Object.fromEntries(MONDO_FILE_TYPES.map((t) => [String(t), "/"])),
      this.settings.rootPaths ?? {}
    );

    this.settings.templates = Object.assign(
      Object.fromEntries(MONDO_FILE_TYPES.map((t) => [String(t), ""])),
      this.settings.templates ?? {}
    );

    this.settings.openAIWhisperApiKey = this.settings.openAIWhisperApiKey ?? "";
    this.settings.openAIVoice = this.settings.openAIVoice ?? "";
    this.settings.openAIModel = this.settings.openAIModel ?? "gpt-5-nano";
    this.settings.editWithAIModel = normalizeEditWithAIModel(
      this.settings.editWithAIModel
    );
    this.settings.openAITranscriptionPolishEnabled =
      typeof this.settings.openAITranscriptionPolishEnabled === "boolean"
        ? this.settings.openAITranscriptionPolishEnabled
        : true;
    const voiceDictationSettings = this.settings.voiceDictation ?? {};
    this.settings.voiceDictation = {
      showRecordingButton: voiceDictationSettings.showRecordingButton === true,
    };
    const cachePath = this.settings.voiceoverCachePath;
    if (typeof cachePath === "string" && cachePath.trim()) {
      this.settings.voiceoverCachePath = cachePath.trim();
    } else {
      this.settings.voiceoverCachePath = "/voiceover";
    }

    const selfPersonPath = this.settings.selfPersonPath;
    if (typeof selfPersonPath === "string") {
      this.settings.selfPersonPath = selfPersonPath.trim();
    } else {
      this.settings.selfPersonPath = "";
    }

    this.settings.includeFrontmatterInChatGPT =
      this.settings.includeFrontmatterInChatGPT === true;

    // Normalize settings-based custom JSON configuration (textarea)
    const customJson = this.settings.mondoConfigJson;
    this.settings.mondoConfigJson =
      typeof customJson === "string" ? customJson : "";

    const presetKey = this.settings.mondoConfigPresetKey;
    this.settings.mondoConfigPresetKey =
      typeof presetKey === "string" ? presetKey.trim() : "";

    // Deprecated: file-based config path is ignored, keep only as stored string
    const configNotePath = this.settings.mondoConfigNotePath;
    if (typeof configNotePath !== "string") {
      this.settings.mondoConfigNotePath = "";
    }

    this.settings.timestamp = normalizeTimestampSettings(
      this.settings.timestamp
    );

    const rawDailySettings = this.settings.daily ?? {};
    const normalizedDailySettings = Object.assign(
      {},
      DEFAULT_MONDO_DAILY_SETTINGS,
      rawDailySettings
    );
    const parsedRetention = Number.parseInt(
      String(rawDailySettings.historyRetentionDays ?? ""),
      10
    );
    normalizedDailySettings.historyRetentionDays =
      !Number.isNaN(parsedRetention) && parsedRetention > 0
        ? parsedRetention
        : DEFAULT_MONDO_DAILY_SETTINGS.historyRetentionDays;
    this.settings.daily = normalizedDailySettings;

    const dashboardSettings = this.settings.dashboard ?? {};
    let didMigrate = false;

    // Migrations: move legacy keys into dashboard if present
    const legacyQuickTasks = (this.settings as any).quickTasksEntities;
    if (
      Array.isArray(legacyQuickTasks) &&
      (!Array.isArray((dashboardSettings as any).quickTasksEntities) ||
        ((dashboardSettings as any).quickTasksEntities as unknown[]).length === 0)
    ) {
      (dashboardSettings as any).quickTasksEntities = legacyQuickTasks;
      didMigrate = true;
    }
    const legacyEnableQuickDaily = (this.settings as any).enableQuickDaily;
    if (
      typeof legacyEnableQuickDaily === "boolean" &&
      typeof (dashboardSettings as any).enableQuickDaily !== "boolean"
    ) {
      (dashboardSettings as any).enableQuickDaily = legacyEnableQuickDaily;
      didMigrate = true;
    }
    // Always clean up legacy root keys so they don't repopulate on next load
    if (Object.prototype.hasOwnProperty.call(this.settings as any, "quickTasksEntities")) {
      delete (this.settings as any).quickTasksEntities;
      didMigrate = true;
    }
    if (Object.prototype.hasOwnProperty.call(this.settings as any, "enableQuickDaily")) {
      delete (this.settings as any).enableQuickDaily;
      didMigrate = true;
    }
    const disableStatsSetting = dashboardSettings.disableStats;
    const legacyEnableStats = dashboardSettings.enableStats;
    const quickSearchEntitiesSetting = dashboardSettings.quickSearchEntities;
    const quickTasksEntitiesSetting = dashboardSettings.quickTasksEntities;
    const entityTilesSetting = dashboardSettings.entityTiles;
    const relevantNotesModeSetting = dashboardSettings.relevantNotesMode;
    const relevantNotesMode =
      relevantNotesModeSetting === "history" ? "history" : "hits";
    const disableStats =
      disableStatsSetting === true
        ? true
        : disableStatsSetting === false
        ? false
        : legacyEnableStats === true
        ? false
        : legacyEnableStats === false
        ? true
        : true;
    const quickSearchEntities = sanitizeEntityTypeList(
      quickSearchEntitiesSetting,
      MONDO_ENTITY_TYPES
    );
    const quickTasksEntities = sanitizeEntityTypeList(
      quickTasksEntitiesSetting,
      MONDO_ENTITY_TYPES
    );
    const entityTiles = sanitizeEntityTypeList(
      entityTilesSetting,
      MONDO_ENTITY_TYPES
    );
    const collapsedPanelsSetting = dashboardSettings.collapsedPanels;
    const collapsedPanels: Record<string, boolean> = {};
    if (collapsedPanelsSetting && typeof collapsedPanelsSetting === "object") {
      for (const [key, value] of Object.entries(
        collapsedPanelsSetting as Record<string, unknown>
      )) {
        if (typeof value === "boolean") {
          collapsedPanels[key] = value;
        }
      }
    }
    this.settings.dashboard = {
      openAtBoot: dashboardSettings.openAtBoot === true,
      forceTab: dashboardSettings.forceTab === true,
      enableQuickDaily: dashboardSettings.enableQuickDaily === true,
      enableQuickTasks: dashboardSettings.enableQuickTasks !== false,
      enableRelevantNotes: dashboardSettings.enableRelevantNotes !== false,
      relevantNotesMode,
      disableStats,
      quickSearchEntities,
      quickTasksEntities,
      entityTiles,
      collapsedPanels,
    };

    // If we migrated legacy keys, persist the normalized settings immediately
    if (didMigrate) {
      await this.saveSettings();
    }

    const ribbonSettings = this.settings.ribbonIcons ?? {};
    this.settings.ribbonIcons = {
      dashboard: ribbonSettings.dashboard !== false,
      audioLogs: ribbonSettings.audioLogs !== false,
      vaultImages: ribbonSettings.vaultImages !== false,
      vaultFiles: ribbonSettings.vaultFiles !== false,
      vaultNotes: ribbonSettings.vaultNotes !== false,
    };

    const vaultImagesSettings = this.settings.vaultImages ?? {};
    const viewMode =
      vaultImagesSettings.viewMode === "grid" ? "grid" : "wall";
    this.settings.vaultImages = {
      viewMode,
    };
  }

  private syncRibbonIcon(
    current: HTMLElement | null,
    enabled: boolean,
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLElement | null {
    if (!enabled) {
      current?.remove();
      return null;
    }

    if (current && current.isConnected) {
      return current;
    }

    current?.remove();
    return this.addRibbonIcon(icon, title, onClick);
  }

  public refreshRibbonIcons(): void {
    if (!Platform.isDesktopApp) {
      this.dashboardRibbonEl?.remove();
      this.dashboardRibbonEl = null;
      this.audioLogsRibbonEl?.remove();
      this.audioLogsRibbonEl = null;
      this.vaultImagesRibbonEl?.remove();
      this.vaultImagesRibbonEl = null;
      this.vaultFilesRibbonEl?.remove();
      this.vaultFilesRibbonEl = null;
      this.vaultNotesRibbonEl?.remove();
      this.vaultNotesRibbonEl = null;
      return;
    }

    const ribbonSettings = (this.settings.ribbonIcons ?? {}) as Record<
      string,
      unknown
    >;
    const isEnabled = (key: string): boolean => ribbonSettings[key] !== false;

    this.dashboardRibbonEl = this.syncRibbonIcon(
      this.dashboardRibbonEl,
      isEnabled("dashboard"),
      DASHBOARD_ICON,
      "List Mondo Dashboard",
      () => {
        void this.showPanel(DASHBOARD_VIEW, "main");
      }
    );

    this.audioLogsRibbonEl = this.syncRibbonIcon(
      this.audioLogsRibbonEl,
      isEnabled("audioLogs"),
      AUDIO_LOGS_ICON,
      "List Audio Notes",
      () => {
        void this.showPanel(AUDIO_LOGS_VIEW, "main");
      }
    );

    this.vaultImagesRibbonEl = this.syncRibbonIcon(
      this.vaultImagesRibbonEl,
      isEnabled("vaultImages"),
      VAULT_IMAGES_ICON,
      "List Images",
      () => {
        void this.showPanel(VAULT_IMAGES_VIEW, "main");
      }
    );

    this.vaultFilesRibbonEl = this.syncRibbonIcon(
      this.vaultFilesRibbonEl,
      isEnabled("vaultFiles"),
      VAULT_FILES_ICON,
      "List Files",
      () => {
        void this.showPanel(VAULT_FILES_VIEW, "main");
      }
    );

    this.vaultNotesRibbonEl = this.syncRibbonIcon(
      this.vaultNotesRibbonEl,
      isEnabled("vaultNotes"),
      VAULT_NOTES_ICON,
      "List Markdown Notes",
      () => {
        void this.showPanel(VAULT_NOTES_VIEW, "main");
      }
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Apply Mondo configuration from the settings textarea
  async applyMondoConfigFromSettings() {
    const raw = (this.settings.mondoConfigJson ?? "").trim();
    if (!raw) {
      const presetKey = (this.settings.mondoConfigPresetKey ?? "").trim();
      if (presetKey) {
        const preset = MONDO_CONFIG_PRESETS.find(
          (entry) => entry.key === presetKey
        );

        if (preset) {
          setMondoConfig(preset.config as any);
          const entityCount = Object.keys(preset.config.entities ?? {}).length;
          console.log(
            `Mondo: applied preset Mondo config "${presetKey}" with ${entityCount} entities`
          );
          this.app.workspace.trigger("mondo:config-updated", {
            source: `preset:${presetKey}`,
            notePath: null,
          });
          return;
        }

        console.warn(
          `Mondo: unable to find preset configuration for key "${presetKey}"`
        );
      }

      setMondoConfig(defaultMondoConfig as any);
      console.log("Mondo: applied built-in Mondo config (no custom JSON)");
      this.app.workspace.trigger("mondo:config-updated", {
        source: "default",
        notePath: null,
      });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      new Notice(
        `Invalid Mondo configuration JSON: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      return;
    }

    const validation = validateMondoConfig(parsed);
    if (!validation.ok) {
      const details = validation.issues
        .map((i) => `${i.path}: ${i.message}`)
        .join("\n");
      console.warn("Mondo: invalid pasted configuration\n" + details);
      new Notice("Mondo configuration is invalid. See console for details.");
      return;
    }

    setMondoConfig(validation.config as any);
    console.log(
      `Mondo: applied custom Mondo config from settings with ${
        Object.keys(validation.config.entities).length
      } entities`
    );
    this.app.workspace.trigger("mondo:config-updated", {
      source: "custom",
      notePath: null,
    });
  }

  async onload() {
    console.clear();
    console.log("Mondo: Loading plugin");

    // Initialize settings
    this.addSettingTab(new SettingsView(this.app, this));
    await this.loadSettings();

    // Apply configuration from settings (custom JSON or defaults)
    await this.applyMondoConfigFromSettings();

    registerDictationIcon();

    this.audioTranscriptionManager = new AudioTranscriptionManager(this);
    this.audioTranscriptionManager.initialize();

    this.voiceoverManager = new VoiceoverManager(this);
    this.voiceoverManager.initialize();

    this.noteDictationManager = new NoteDictationManager(this);
    this.noteDictationManager.initialize();
    this.noteDictationManager.activateMobileToolbar();

    this.timestampToolbarManager = new TimestampToolbarManager(this);
    this.timestampToolbarManager.initialize();
    this.timestampToolbarManager.activateMobileToolbar();

    this.copyNoteToolbarManager = new CopyNoteToolbarManager(this);
    this.copyNoteToolbarManager.initialize();
    this.copyNoteToolbarManager.activateMobileToolbar();

    this.magicPasteToolbarManager = new MagicPasteToolbarManager(this);
    this.magicPasteToolbarManager.initialize();
    this.magicPasteToolbarManager.activateMobileToolbar();

    this.dailyNoteTracker = new DailyNoteTracker(this);

    this.app.workspace.onLayoutReady(() => {
      this.noteDictationManager?.activateMobileToolbar();
      this.timestampToolbarManager?.activateMobileToolbar();
      this.copyNoteToolbarManager?.activateMobileToolbar();
      this.magicPasteToolbarManager?.activateMobileToolbar();
    });

    // Initialize the Mondo file manager in the background (non-blocking)
    const fileManager = MondoFileManager.getInstance(this.app);
    fileManager.initialize().catch((err) => {
      console.error("Mondo: Failed to initialize file manager:", err);
    });

    this.registerEvent(
      this.app.vault.on("create", (abstract) => {
        if (!(abstract instanceof TFile) || abstract.extension !== "md") {
          return;
        }

        this.dailyNoteTracker?.handleFileCreated(abstract);
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", (abstract) => {
        if (!(abstract instanceof TFile) || abstract.extension !== "md") {
          return;
        }

        this.dailyNoteTracker?.handleFileModified(abstract);
      })
    );

    this.addCommand({
      id: "open-dashboard",
      name: "Open Mondo Dashboard",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "m" }], // Cmd/Ctrl+Shift+M (user can change later)
        callback: () => this.showPanel(DASHBOARD_VIEW, "main"),
    });

    this.addCommand({
      id: "open-audio-notes",
      name: "Open Audio Notes",
      callback: () => this.showPanel(AUDIO_LOGS_VIEW, "main"),
    });

    this.addCommand({
      id: "open-vault-images",
      name: "Open Images",
      callback: () => this.showPanel(VAULT_IMAGES_VIEW, "main"),
    });

    this.addCommand({
      id: "open-vault-files",
      name: "Open Files",
      callback: () => this.showPanel(VAULT_FILES_VIEW, "main"),
    });

    this.addCommand({
      id: "open-vault-notes",
      name: "Open Markdown Notes",
      callback: () => this.showPanel(VAULT_NOTES_VIEW, "main"),
    });

    this.addCommand({
      id: "edit-image",
      name: "Edit Image",
      checkCallback: (checking) => {
        const file = findActiveOrSelectedImageFile(this.app);

        if (!file || !isImageEditSupported(file)) {
          return false;
        }

        if (!checking) {
          openEditImageModal(this.app, file);
        }

        return true;
      },
    });

    this.addCommand({
      id: "transcribe-audio-note",
      name: "Start Transcription",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();

        if (!file || !this.audioTranscriptionManager?.isAudioFile(file)) {
          return false;
        }

        if (!checking) {
          void this.audioTranscriptionManager?.transcribeAudioFile(
            file,
            file.path
          );
        }

        return true;
      },
    });

    this.addCommand({
      id: "mondo-start-note-dictation",
      name: "Start Dictation",
      icon: "mic",
      editorCallback: async () => {
        const status = this.noteDictationManager?.getDictationStatus();
        if (status === "recording") {
          const stopResult = this.noteDictationManager?.stopDictation({
            showDisabledNotice: true,
          });
          if (stopResult === "stopped") {
            new Notice("Dictation stopped. Processing…");
          }
          return;
        }

        const result = await this.noteDictationManager?.startDictation();
        if (result === "started") {
          new Notice("Dictation started. Tap again to stop.");
        } else if (result === "recording") {
          new Notice("Dictation already in progress.");
        }
      },
    });

    this.addCommand({
      id: "toggle-journaling",
      name: "Toggle Journaling",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "j" }],
      callback: async () => {
        try {
          const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
          const activeFile = activeView?.file ?? null;
          
          if (isJournalNote(activeFile, this)) {
            // Currently viewing journal, close it
            await this.showPanel(DASHBOARD_VIEW, "main");
          } else {
            // Not viewing journal, open it
            console.log("Opening journal...");
            await openJournal(this.app, this);
          }
        } catch (e) {
          console.error("Mondo: Failed to toggle journaling:", e);
        }
      },
    });

    
    this.addCommand({
      id: "focus-mode-toggle",
      name: "Toggle Focus Mode",
      callback: () => {
        if (isFocusModeActive()) {
          deactivateFocusMode(this.app, "manual");
        } else {
          activateFocusMode(this.app, "manual");
        }
      },
    });

    this.addCommand({
      id: "open-today",
      name: "Open Daily Note",
      callback: async () => openDailyNote(this.app, this),
    });

    this.addCommand({
      id: "open-self-person",
      name: "Open Myself",
      callback: () => {
        void openSelfPersonNote(this.app, this);
      },
    });

    this.addCommand({
      id: "add-log",
      name: "Append to Daily Note",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "l" }],
      callback: async () => addDailyLog(this.app, this),
    });

    this.addCommand({
      id: "talk-to-daily",
      name: "Talk to Daily Note",
      callback: async () => talkToDaily(this.app, this),
    });

    this.addCommand({
      id: "record-to-daily",
      name: "Record to Daily Note",
      callback: async () => recordToDaily(this.app, this),
    });

    this.addCommand({
      id: "cleanup-daily-history",
      name: "Cleanup Daily Notes History",
      callback: () => {
        void cleanupDailyHistory(this.app, this);
      },
    });

    this.addCommand({
      id: "insert-timestamp",
      name: "Add Timestamp",
      icon: "clock",
      editorCallback: () => {
        insertTimestamp(this.app, this);
      },
    });

    this.addCommand({
      id: "copy-note-text",
      name: "Copy Note Text",
      icon: "copy",
      editorCallback: (editor, context) => {
        const markdownView =
          context instanceof MarkdownView
            ? context
            : this.app.workspace.getActiveViewOfType(MarkdownView);

        void copyNoteText(this.app, { editor, view: markdownView });
      },
      callback: () => {
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView) ?? null;

        void copyNoteText(this.app, {
          view: markdownView,
          editor: markdownView?.editor ?? undefined,
        });
      },
    });

    this.addCommand({
      id: "magic-paste",
      name: "Magic Paste",
      icon: "clipboard-paste",
      editorCallback: (editor, context) => {
        const markdownView =
          context instanceof MarkdownView
            ? context
            : this.app.workspace.getActiveViewOfType(MarkdownView);

        void openMagicPaste(this.app, this, {
          editor,
          view: markdownView ?? undefined,
        });
      },
      callback: () => {
        void openMagicPaste(this.app, this);
      },
    });

    this.addCommand({
      id: "edit-with-ai",
      name: "Edit with AI",
      editorCallback: (editor, context) => {
        const markdownView =
          context instanceof MarkdownView
            ? context
            : this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!markdownView) {
          new Notice("Open a note to edit with AI.");
          return;
        }

        void openEditWithAI(this, editor, markdownView);
      },
    });

    this.addCommand({
      id: "send-to-chatgpt",
      name: "Send to ChatGPT",
      icon: "external-link",
      editorCallback: (editor, context) => {
        const markdownView =
          context instanceof MarkdownView
            ? context
            : this.app.workspace.getActiveViewOfType(MarkdownView);

        void sendToChatGPT(this.app, {
          editor,
          view: markdownView,
          includeFrontmatter: this.settings.includeFrontmatterInChatGPT,
        });
      },
    });

    this.addCommand({
      id: "add-geolocation",
      name: "Add Geolocation to Current Note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();

        if (!file || file.extension !== "md") {
          return false;
        }

        if (!checking) {
          void this.applyGeolocationToFile(file, { notify: true });
        }

        return true;
      },
    });

    this.addCommand({
      id: "cancel-geolocation",
      name: "Cancel Geolocation Request",
      checkCallback: (checking) => {
        if (checking) {
          return this.geolocationAbortController !== null;
        }

        if (this.geolocationAbortController) {
          this.geolocationAbortController.abort();
          this.geolocationAbortController = null;
        }

        return true;
      },
    });

    this.addCommand({
      id: "start-voiceover",
      name: "Start Voiceover",
      icon: "megaphone",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") {
          return false;
        }

        if (!checking) {
          void (async () => {
            const content = await this.app.vault.read(file);
            const activeView =
              this.app.workspace.getActiveViewOfType(MarkdownView);
            const activeEditor =
              activeView?.file?.path === file.path ? activeView.editor : null;
            const selection = activeEditor?.getSelection?.() ?? "";

            // If there's a selection, use it; otherwise use the entire note
            const selectedText = selection.trim() ? selection : null;
            const voiceoverText = buildVoiceoverText(
              content,
              file,
              selectedText
            );

            void this.voiceoverManager?.generateVoiceover(
              file,
              activeEditor ?? null,
              voiceoverText,
              {
                scope: selectedText ? "selection" : "note",
              }
            );
          })();
        }

        return true;
      },
    });

    MONDO_ENTITY_TYPES.forEach((fileType) => {
      const config = getMondoEntityConfig(fileType);
      const label = config?.name ?? fileType;
      const singularLabel = (config as any)?.singular ?? label;
      this.addCommand({
        id: `open-${fileType}`,
        name: `List ${label}`,
        callback: () => {
          void this.openEntityPanel(fileType);
        },
      });
      this.addCommand({
        id: `new-${fileType}`,
        name: `New ${singularLabel}`,
        callback: () => {
          void this.createEntityNote(fileType);
        },
      });
    });

    // Journal navigation (previous / next)
    const journalMove = journalMoveFactory(this.app, this);
    const canMoveBetweenJournalEntries = () => {
      const file = this.app.workspace.getActiveFile();
      if (!file || file.extension !== "md") {
        return false;
      }

      const frontmatter =
        this.app.metadataCache.getFileCache(file)?.frontmatter ?? null;
      const typeValue =
        typeof frontmatter?.mondoType === "string"
          ? frontmatter.mondoType
          : typeof frontmatter?.type === "string"
          ? frontmatter.type
          : null;

      return typeof typeValue === "string" && isJournalType(typeValue);
    };

    this.addCommand({
      id: "journal-prev",
      name: "Move to Previous Journal Entry",
      checkCallback: (checking) => {
        if (!canMoveBetweenJournalEntries()) {
          return false;
        }

        if (!checking) {
          void journalMove("prev");
        }

        return true;
      },
    });

    this.addCommand({
      id: "journal-next",
      name: "Move to Next Journal Entry",
      checkCallback: (checking) => {
        if (!canMoveBetweenJournalEntries()) {
          return false;
        }

        if (!checking) {
          void journalMove("next");
        }

        return true;
      },
    });

    this.addCommand({
      id: "open-mondo-settings",
      name: "Open Mondo Settings",
      callback: () => {
        (this.app as any).setting.open();
        (this.app as any).setting.openTabById(this.manifest.id);
      },
    });

    this.registerMarkdownCodeBlockProcessor(
      "mondo",
      async (...args) => new MondoInlineViewWrapper(this.app, ...args)
    );

    this.registerMarkdownPostProcessor((element, context) => {
      this.audioTranscriptionManager?.decorateMarkdown(element, context);
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file, source) => {
        this.extendFileMenu(menu, file, source);
      })
    );

    // this.registerView(
    //   MONDO_SIDE_VIEW,
    //   (leaf) => new MondoSideViewWrapper(leaf, MONDO_ICON)
    // );

    this.registerView(
      DASHBOARD_VIEW,
      (leaf) => new MondoDashboardViewWrapper(leaf, DASHBOARD_ICON)
    );

    this.registerView(
      AUDIO_LOGS_VIEW,
      (leaf) => new MondoAudioLogsViewWrapper(this, leaf, AUDIO_LOGS_ICON)
    );

    this.registerView(
      VAULT_IMAGES_VIEW,
      (leaf) => new MondoVaultImagesViewWrapper(leaf, VAULT_IMAGES_ICON)
    );

    this.registerView(
      VAULT_FILES_VIEW,
      (leaf) => new MondoVaultFilesViewWrapper(leaf, VAULT_FILES_ICON)
    );

    this.registerView(
      VAULT_NOTES_VIEW,
      (leaf) => new MondoVaultNotesViewWrapper(leaf, VAULT_NOTES_ICON)
    );

    this.registerView(
      ENTITY_PANEL_VIEW,
      (leaf) => new MondoEntityPanelViewWrapper(leaf, MONDO_ICON)
    );

    this.refreshRibbonIcons();

    // Note: removed automatic side-panel/tab control. The plugin no longer
    // open/close or reorder side panels. Keep daily tracker behavior.
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.dailyNoteTracker?.handleFileOpened(file);
        void this.ensureDashboardIfEmpty();
      })
    );

    // Ensure dashboard is opened when no notes are present and the user
    // has enabled the "forceTab" dashboard setting. This is intentionally
    // minimal: it opens the dashboard in a main leaf and does not change
    // splits or reorder tabs.
    this.app.workspace.onLayoutReady(() => {
      void this.ensureDashboardIfEmpty();
      void cleanupDailyHistory(this.app, this, { silent: true });
    });
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.ensureDashboardIfEmpty();
      })
    );

    // Inject journal navigational components (pass plugin so handler can read settings)
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", injectJournalNav(this))
    );

    // Automatically toggle focus mode for journal notes
    const journalFocusModeHandler = createJournalFocusModeHandler(this);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", journalFocusModeHandler)
    );

    // Inject close button for journal notes
    const journalCloseButtonHandler = injectJournalCloseButton(this);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", journalCloseButtonHandler)
    );
    // Also react immediately to focus-mode changes (manual/journal toggles)
    this.registerEvent(
      // @ts-ignore - custom event name
      this.app.workspace.on("mondo:focus-mode-changed", journalCloseButtonHandler)
    );

    // Inject a small "Hello World" div for Mondo-type notes (company/person/project/team)
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", injectMondoLinks(this))
    );

    // Inject paste handler for property fields (e.g., pasting images into cover property)
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", injectPropertyPasteHandler(this))
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        if (!(view instanceof MarkdownView)) {
          return;
        }

        const file = view.file;
        if (!file) {
          return;
        }

        const resolvedEditor = editor ?? view.editor ?? null;
        const selection = resolvedEditor?.getSelection?.() ?? "";
        if (!selection.trim()) {
          return;
        }

        menu.addItem((item) => {
          item.setTitle("Start Voiceover");
          item.setIcon("file-audio");
          item.onClick(() => {
            const selection = resolvedEditor?.getSelection?.() ?? "";
            if (selection.trim()) {
              void this.voiceoverManager?.generateVoiceover(
                file,
                resolvedEditor,
                selection,
                { scope: "selection" }
              );
            }
          });
        });
      })
    );
  }

  onunload() {
    console.log("Mondo: Unloading plugin");

    // No config manager to dispose; settings-based config only
    this.mondoConfigManager = null;

    resetFocusMode(this.app);
    disposeJournalCloseButton();

    // Cleanup the Mondo file manager
    const fileManager = MondoFileManager.getInstance(this.app);
    fileManager.cleanup();

    this.app.workspace
      .getLeavesOfType(DASHBOARD_VIEW)
      .forEach((leaf) => leaf.detach());
    this.app.workspace
      .getLeavesOfType(ENTITY_PANEL_VIEW)
      .forEach((leaf) => leaf.detach());
    this.app.workspace
      .getLeavesOfType(AUDIO_LOGS_VIEW)
      .forEach((leaf) => leaf.detach());

    this.dashboardRibbonEl?.remove();
    this.dashboardRibbonEl = null;
    this.audioLogsRibbonEl?.remove();
    this.audioLogsRibbonEl = null;
    this.vaultImagesRibbonEl?.remove();
    this.vaultImagesRibbonEl = null;
    this.vaultFilesRibbonEl?.remove();
    this.vaultFilesRibbonEl = null;
    this.vaultNotesRibbonEl?.remove();
    this.vaultNotesRibbonEl = null;

    disposeMondoLinkInjections();
    disposePropertyPasteHandlers();

    this.audioTranscriptionManager?.dispose();
    this.audioTranscriptionManager = null;

    this.voiceoverManager?.dispose();
    this.voiceoverManager = null;

    this.noteDictationManager?.dispose();
    this.noteDictationManager = null;

    this.timestampToolbarManager?.dispose();
    this.timestampToolbarManager = null;

    this.copyNoteToolbarManager?.dispose();
    this.copyNoteToolbarManager = null;

    this.magicPasteToolbarManager?.dispose();
    this.magicPasteToolbarManager = null;
  }

  getAudioTranscriptionManager(): AudioTranscriptionManager | null {
    return this.audioTranscriptionManager;
  }

  private extendFileMenu(menu: Menu, file: TAbstractFile, source?: string) {
    if (!(file instanceof TFile)) {
      return;
    }

    if (file.extension === "md") {
      const commandId = `${this.manifest.id}:start-voiceover`;
      const commandSources = new Set([
        "view-header",
        "more-options",
        "inline-title",
        "tab-header",
      ]);

      menu.addItem((item) => {
        item.setTitle("Start Voiceover");
        item.setIcon("file-audio");
        item.onClick(() => {
          if (commandSources.has(source ?? "")) {
            const commands = (
              this.app as App & {
                commands?: { executeCommandById?: (id: string) => boolean };
              }
            ).commands;
            if (commands?.executeCommandById) {
              void commands.executeCommandById(commandId);
            }
            return;
          }

          void (async () => {
            const content = await this.app.vault.read(file);
            const activeView =
              this.app.workspace.getActiveViewOfType(MarkdownView);
            const activeEditor =
              activeView?.file?.path === file.path ? activeView.editor : null;
            const voiceoverText = buildVoiceoverText(content, file);
            void this.voiceoverManager?.generateVoiceover(
              file,
              activeEditor ?? null,
              voiceoverText,
              { scope: "note" }
            );
          })();
        });
      });
    }

    if (!this.audioTranscriptionManager) {
      return;
    }

    if (!this.audioTranscriptionManager.isAudioFile(file)) {
      return;
    }

    const inProgress =
      this.audioTranscriptionManager.isTranscriptionInProgress(file);

    menu.addItem((item) => {
      item.setTitle(inProgress ? "Transcribing audio…" : "Transcribe audio");
      item.setIcon(inProgress ? "loader-2" : "wand-2");
      if (inProgress) {
        item.setDisabled(true);
        return;
      }

      item.onClick(() => {
        void this.audioTranscriptionManager?.transcribeAudioFile(
          file,
          source ?? file.path
        );
      });
    });

    if (this.audioTranscriptionManager.hasExistingTranscription(file)) {
      menu.addItem((item) => {
        item.setTitle("Open transcription");
        item.setIcon("file-text");
        item.onClick(() => {
          this.audioTranscriptionManager?.openTranscription(
            file,
            source ?? file.path
          );
        });
      });
    }
  }

  private async createEntityNote(
    entityType: MondoFileType
  ): Promise<TFile | null> {
    const config = getMondoEntityConfig(entityType);
    const label = config?.name ?? entityType;
    const singularLabel = (config as any)?.singular ?? label;

    const sanitizeFileBase = (value: string): string =>
      value
        .replace(/[<>:"/\\|?*]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/[\r\n]+/g, " ")
        .trim();

    try {
      const now = new Date();
      const settings = this.settings as {
        rootPaths?: Partial<Record<MondoFileType, string>>;
        templates?: Partial<Record<MondoFileType, string>>;
      };

      const folderSetting = settings.rootPaths?.[entityType] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);
      if (normalizedFolder) {
        const existingFolder =
          this.app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await this.app.vault.createFolder(normalizedFolder);
        }
      }

      const displayBase =
        `Untitled ${singularLabel}`.replace(/\s+/g, " ").trim() || "Untitled";
      const fileBaseRoot =
        sanitizeFileBase(displayBase) || `untitled-${Date.now()}`;

      let attempt = 0;
      let filename = "";
      let filePath = "";
      let displayTitle = displayBase;

      while (true) {
        const suffix = attempt === 0 ? "" : `-${attempt}`;
        const titleSuffix = attempt === 0 ? "" : ` ${attempt + 1}`;
        filename = `${fileBaseRoot}${suffix}.md`;
        filePath = normalizedFolder
          ? `${normalizedFolder}/${filename}`
          : filename;
        displayTitle = `${displayBase}${titleSuffix}`.trim();
        const existing = this.app.vault.getAbstractFileByPath(filePath);
        if (!existing) {
          break;
        }
        attempt += 1;
      }

      const isoTimestamp = now.toISOString();
      const templateSource = await getTemplateForType(
        this.app,
        settings.templates ?? {},
        entityType
      );
      const slugValue =
        slugify(displayTitle) || slugify(fileBaseRoot) || `${Date.now()}`;

      const content = renderTemplate(templateSource, {
        title: displayTitle,
        mondoType: String(entityType),
        type: String(entityType),
        filename,
        slug: slugValue,
        date: isoTimestamp,
        datetime: isoTimestamp,
      });

      const created = (await this.app.vault.create(filePath, content)) as TFile;

      await this.app.fileManager.processFrontMatter(created, (frontmatter) => {
        frontmatter.mondoType = String(entityType);
        if (Object.prototype.hasOwnProperty.call(frontmatter, "type")) {
          delete (frontmatter as Record<string, unknown>).type;
        }
      });

      const leaf = this.app.workspace.getLeaf(true);
      if (leaf) {
        await (leaf as any).openFile(created);
        focusAndSelectTitle(leaf);
      }

      new Notice(`Created new ${singularLabel} note.`);
      return created;
    } catch (error) {
      console.error(`Mondo: failed to create ${singularLabel} note`, error);
      new Notice(`Failed to create ${singularLabel} note.`);
      return null;
    }
  }

  private async openEntityPanel(entityType: MondoFileType) {
    const state: MondoEntityPanelViewState = { entityType };
    if (!getMondoEntityConfig(entityType)) {
      console.warn(
        "Mondo: attempted to open panel for unknown type",
        entityType
      );
      return;
    }
    await this.showPanel(ENTITY_PANEL_VIEW, "main", {
      state,
      reuseMatching: (leaf) => {
        const viewState = leaf.getViewState();
        const entityState = viewState.state as
          | MondoEntityPanelViewState
          | undefined;
        return entityState?.entityType === entityType;
      },
    });
  }

  async showPanel(
    viewType: string,
    placement: "main" | "left" | "right" | "current",
    options?: PanelOpenOptions
  ) {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(viewType);
    let leaf: WorkspaceLeaf | null = null;

    if (options?.reuseMatching) {
      leaf = leaves.find(options.reuseMatching) ?? null;
    } else {
      leaf = leaves[0] ?? null;
    }

    if (!leaf) {
      switch (placement) {
        case "main":
          leaf = workspace.getLeaf(true);
          break;
        case "current":
          leaf = workspace.getLeaf(false);
          break;
        default:
          // Left/right placement no longer requests side leaves. Fall back to a main leaf.
          leaf = workspace.getLeaf(true);
          break;
      }
    }

    if (!leaf) {
      return;
    }

    const viewState: ViewState = options?.state
      ? { type: viewType, active: true, state: options.state }
      : { type: viewType, active: true };

    await leaf.setViewState(viewState);
    // Do not reorder or force tab positions. Reveal the leaf and stop.
    workspace.revealLeaf(leaf);
  }

  // Note: side-panel/tab reordering behaviour was removed. The plugin no
  // longer manipulates main tab ordering or forces leaves into the first
  // position. Focus mode logic remains handled elsewhere.

  // Automatic side-panel control (open/close/reorder) removed. Focus
  // mode is still managed elsewhere based on journal context.

  private async ensureDashboardIfEmpty() {
    try {
      if (!this.settings?.dashboard?.forceTab) return;
      const ws = this.app.workspace;
      const hasAnyNote = ws.getLeavesOfType("markdown").length > 0;
      if (hasAnyNote) return;

      const dashboardOpen = ws.getLeavesOfType(DASHBOARD_VIEW).length > 0;
      if (!dashboardOpen) {
        // Open the dashboard in a regular main leaf. Do not manipulate splits or tabs.
        await this.showPanel(DASHBOARD_VIEW, "main");
      }
    } catch (e) {
      console.warn("Mondo: failed to ensure dashboard when empty", e);
    }
  }

  getVoiceoverManager = () => this.voiceoverManager;

  getNoteDictationManager = () => this.noteDictationManager;
}
