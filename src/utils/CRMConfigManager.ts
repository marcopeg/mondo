import {
  App,
  Notice,
  TAbstractFile,
  TFile,
  type EventRef,
} from "obsidian";
import defaultConfig from "@/crm-config.json";
import { getCRMConfig, setCRMConfig } from "@/entities";
import type { CRMConfig, CRMEntityConfigRecord } from "@/types/CRMEntityTypes";

const BASE_CONFIG = defaultConfig as CRMConfig;

const cloneConfig = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const DEFAULT_ENTITY_KEYS = Object.keys(BASE_CONFIG.entities);

const formatTimestampId = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}${month}${day}${hour}${minute}${second}`;
};

const ensureOrder = (rawOrder: unknown, entityKeys: string[]): string[] => {
  if (!Array.isArray(rawOrder)) {
    return [...entityKeys];
  }

  const filtered = rawOrder.filter(
    (value): value is string => typeof value === "string"
  );

  const unique = filtered.filter(
    (value, index, array) => array.indexOf(value) === index
  );

  const valid = unique.filter((value) => entityKeys.includes(value));

  const completed = [...valid];
  for (const key of entityKeys) {
    if (!completed.includes(key)) {
      completed.push(key);
    }
  }

  return completed;
};

type ValidationIssue = {
  path: string;
  message: string;
};

type ValidationResult =
  | { ok: true; config: CRMConfig }
  | { ok: false; issues: ValidationIssue[] };

const validateCRMConfig = (candidate: unknown): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!isRecord(candidate)) {
    issues.push({
      path: "root",
      message: "Configuration file must define a JSON object.",
    });
    return { ok: false, issues };
  }

  const resolved = isRecord(candidate.crmConfig)
    ? candidate.crmConfig
    : candidate;

  if (!isRecord(resolved)) {
    issues.push({
      path: "crmConfig",
      message: "The `crmConfig` property must be an object when present.",
    });
    return { ok: false, issues };
  }

  const entities = resolved.entities;
  if (!isRecord(entities)) {
    issues.push({
      path: "entities",
      message: "`entities` must be an object containing the known entity definitions.",
    });
    return { ok: false, issues };
  }

  const entityKeys = Object.keys(entities);
  const missing = DEFAULT_ENTITY_KEYS.filter(
    (key) => !entityKeys.includes(key)
  );

  if (missing.length > 0) {
    issues.push({
      path: "entities",
      message: `Missing entity definitions for: ${missing.join(", ")}.`,
    });
  }

  for (const [entityKey, entityValue] of Object.entries(entities)) {
    if (!isRecord(entityValue)) {
      issues.push({
        path: `entities.${entityKey}`,
        message: "Each entity configuration must be an object.",
      });
      continue;
    }

    if (
      typeof entityValue.name !== "string" ||
      entityValue.name.trim().length === 0
    ) {
      issues.push({
        path: `entities.${entityKey}.name`,
        message: "Entity `name` must be a non-empty string.",
      });
    }

    if ("links" in entityValue && !Array.isArray(entityValue.links)) {
      issues.push({
        path: `entities.${entityKey}.links`,
        message: "`links` must be an array when present.",
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const sanitized = cloneConfig(BASE_CONFIG) as CRMConfig;
  sanitized.entities = cloneConfig(entities) as CRMEntityConfigRecord;

  sanitized.titles = sanitized.titles ?? {};
  sanitized.relevantNotes = sanitized.relevantNotes ?? {};
  sanitized.relevantNotes.filter = sanitized.relevantNotes.filter ?? {};

  const titles = resolved.titles;
  const titlesOrder = isRecord(titles) ? (titles as Record<string, unknown>).order : undefined;
  sanitized.titles.order = ensureOrder(titlesOrder, entityKeys);

  const relevantNotes = resolved.relevantNotes;
  const filter =
    isRecord(relevantNotes) && isRecord(relevantNotes.filter)
      ? relevantNotes.filter
      : {};
  sanitized.relevantNotes.filter.order = ensureOrder(
    (filter as Record<string, unknown>).order,
    entityKeys
  );

  return { ok: true, config: sanitized };
};

const isJsonPath = (path: string) => path.toLowerCase().endsWith(".json");

const isJsonFile = (file: TAbstractFile): file is TFile =>
  file instanceof TFile && isJsonPath(file.path);

type CRMConfigManagerCallbacks = {
  onConfigNotePathChange?: (path: string | null) => void | Promise<void>;
};

type ConfigSource = "default" | "custom";

export class CRMConfigManager {
  private configFilePath: string | null = null;
  private readonly app: App;
  private readonly callbacks: CRMConfigManagerCallbacks;
  private eventRefs: EventRef[] = [];
  private lastSource: ConfigSource = "default";

  constructor(app: App, callbacks: CRMConfigManagerCallbacks = {}) {
    this.app = app;
    this.callbacks = callbacks;
  }

  initialize = async (configFilePath: string | null) => {
    const resolvedPath = this.normalizePath(configFilePath);
    if (resolvedPath && !isJsonPath(resolvedPath)) {
      this.notifyInvalidExtension(resolvedPath);
      await this.callbacks.onConfigNotePathChange?.(null);
      this.applyDefaultConfig();
      return;
    }

    this.configFilePath = resolvedPath;
    if (this.configFilePath) {
      const file = this.resolveJsonFile(this.configFilePath);
      if (file) {
        this.attachFileWatchers(file);
        await this.applyConfigFromFile(file);
        return;
      }
      this.notifyMissingFile(this.configFilePath);
    }
    this.applyDefaultConfig();
  };

  setConfigFilePath = async (configFilePath: string | null) => {
    const resolvedPath = this.normalizePath(configFilePath);
    if (resolvedPath && !isJsonPath(resolvedPath)) {
      this.notifyInvalidExtension(resolvedPath);
      await this.callbacks.onConfigNotePathChange?.(null);
      this.detachFileWatchers();
      this.configFilePath = null;
      this.applyDefaultConfig();
      return;
    }

    if (resolvedPath === this.configFilePath) {
      await this.reload();
      return;
    }

    this.detachFileWatchers();
    this.configFilePath = resolvedPath;

    if (!this.configFilePath) {
      this.applyDefaultConfig();
      return;
    }

    const file = this.resolveJsonFile(this.configFilePath);
    if (!file) {
      this.notifyMissingFile(this.configFilePath);
      this.applyDefaultConfig();
      return;
    }

    this.attachFileWatchers(file);
    await this.applyConfigFromFile(file);
  };

  reload = async () => {
    if (!this.configFilePath) {
      this.applyDefaultConfig();
      return;
    }

    const file = this.resolveJsonFile(this.configFilePath);
    if (!file) {
      this.notifyMissingFile(this.configFilePath);
      this.applyDefaultConfig();
      return;
    }

    await this.applyConfigFromFile(file);
  };

  dispose = () => {
    this.detachFileWatchers();
  };

  private normalizePath = (path: string | null | undefined) => {
    if (typeof path !== "string") {
      return null;
    }
    const trimmed = path.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  private resolveJsonFile = (path: string) => {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file && isJsonFile(file)) {
      return file;
    }
    return null;
  };

  private attachFileWatchers = (file: TFile) => {
    this.detachFileWatchers();

    const trackedFile: TFile = file;

    const handleModify = this.app.vault.on("modify", (modified: TAbstractFile) => {
      if (!isJsonFile(modified)) {
        return;
      }
      if (modified.path === trackedFile.path) {
        void this.applyConfigFromFile(modified);
      }
    });

    const handleDelete = this.app.vault.on("delete", (deleted: TAbstractFile) => {
      if (!isJsonFile(deleted)) {
        return;
      }
      if (deleted.path === trackedFile.path) {
        this.detachFileWatchers();
        this.configFilePath = null;
        void this.callbacks.onConfigNotePathChange?.(null);
        new Notice("CRM configuration file deleted. Reverting to default configuration.");
        this.applyDefaultConfig();
      }
    });

    const handleRename = this.app.vault.on(
      "rename",
      (renamed: TAbstractFile, oldPath: string) => {
        if (!(renamed instanceof TFile)) {
          return;
        }

        if (oldPath === trackedFile.path) {
          if (!isJsonPath(renamed.path)) {
            this.detachFileWatchers();
            this.configFilePath = null;
            void this.callbacks.onConfigNotePathChange?.(null);
            this.notifyInvalidExtension(renamed.path);
            this.applyDefaultConfig();
            return;
          }

          this.configFilePath = renamed.path;
          void this.callbacks.onConfigNotePathChange?.(renamed.path);
          void this.applyConfigFromFile(renamed);
        }
      }
    );

    this.eventRefs = [handleModify, handleDelete, handleRename];
  };

  private detachFileWatchers = () => {
    if (this.eventRefs.length === 0) {
      return;
    }
    for (const ref of this.eventRefs) {
      this.app.vault.offref(ref);
    }
    this.eventRefs = [];
  };

  private applyDefaultConfig = () => {
    const current = getCRMConfig();
    const fallback = cloneConfig(defaultConfig) as CRMConfig;

    if (
      this.lastSource === "default" &&
      JSON.stringify(current) === JSON.stringify(fallback)
    ) {
      return;
    }

    setCRMConfig(fallback);
    this.lastSource = "default";
    this.app.workspace.trigger("crm:config-updated", {
      source: "default",
      notePath: null,
    });
  };

  private applyConfigFromFile = async (file: TFile) => {
    try {
      const content = await this.app.vault.cachedRead(file);

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        await this.handleInvalidConfig(file, [
          {
            path: "root",
            message: `Failed to parse JSON: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ], content);
        return;
      }

      const validation = validateCRMConfig(parsed);
      if (!validation.ok) {
        await this.handleInvalidConfig(file, validation.issues, content);
        return;
      }

      setCRMConfig(validation.config);
      this.lastSource = "custom";
      this.app.workspace.trigger("crm:config-updated", {
        source: "custom",
        notePath: file.path,
      });
    } catch (error) {
      console.error("CRM: failed to read configuration file", error);
      await this.handleInvalidConfig(file, [
        {
          path: file.path,
          message: "Unable to read configuration file.",
        },
      ]);
    }
  };

  private handleInvalidConfig = async (
    file: TFile,
    issues: ValidationIssue[],
    rawContent = ""
  ) => {
    const details =
      issues.length > 0
        ? issues
            .map((issue) => `- \`${issue.path}\`: ${issue.message}`)
            .join("\n")
        : "- No validation details available.";

    new Notice(
      "CRM configuration file is invalid. See the generated error log for details."
    );

    await this.createErrorLog(file, details, rawContent);
    this.applyDefaultConfig();
  };

  private createErrorLog = async (
    file: TFile,
    issueSummary: string,
    rawContent: string
  ) => {
    const now = new Date();
    const timestamp = formatTimestampId(now);
    const directory = file.parent?.path ?? "";
    const filename = `${file.basename}-error.md`;
    const targetPath = directory ? `${directory}/${filename}` : filename;

    const entryLines = [
      `# ${now.toISOString()}`,
      "",
      "The CRM configuration file could not be loaded due to the following issues:",
      "",
      issueSummary,
      "",
      "## Provided content",
      "",
      "```json",
      rawContent.trim(),
      "```",
      "",
      "---",
      "",
    ];

    const entry = entryLines.join("\n");

    try {
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing instanceof TFile) {
        const prefix = existing.stat.size > 0 ? "\n" : "";
        await this.app.vault.append(existing, `${prefix}${entry}`);
      } else {
        await this.app.vault.create(targetPath, entry);
      }
    } catch (error) {
      console.error("CRM: failed to write config error log", error);
      try {
        const fallbackPath = `${timestamp}-crm-config-error.md`;
        await this.app.vault.create(fallbackPath, entry);
      } catch (fallbackError) {
        console.error("CRM: failed to create fallback config error log", fallbackError);
      }
    }
  };

  private notifyMissingFile = (path: string) => {
    new Notice(`CRM configuration file not found: ${path}`);
  };

  private notifyInvalidExtension = (path: string) => {
    new Notice(`CRM configuration must be a JSON file (received: ${path}).`);
  };
}
