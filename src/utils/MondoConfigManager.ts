import { App, Notice, TAbstractFile, TFile, type EventRef } from "obsidian";
import defaultConfig from "@/mondo-config.json";
import { getMondoConfig, setMondoConfig } from "@/entities";
import type { MondoConfig, MondoEntityConfigRecord } from "@/types/MondoEntityTypes";

const BASE_CONFIG = defaultConfig as MondoConfig;

const cloneConfig = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

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

const ensureSubset = (raw: unknown, entityKeys: string[]): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalizedKeys = new Set(
    entityKeys.map((key) => String(key || "").trim().toLowerCase())
  );

  const result: string[] = [];

  for (const value of raw) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalizedKeys.has(normalized)) {
      continue;
    }

    if (!result.includes(normalized)) {
      result.push(normalized);
    }
  }

  return result;
};

type ValidationIssue = {
  path: string;
  message: string;
};

type ValidationResult =
  | { ok: true; config: MondoConfig }
  | { ok: false; issues: ValidationIssue[] };

export const validateMondoConfig = (candidate: unknown): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!isRecord(candidate)) {
    issues.push({
      path: "root",
      message: "Configuration file must define a JSON object.",
    });
    return { ok: false, issues };
  }

  const resolved = isRecord(candidate.mondoConfig)
    ? candidate.mondoConfig
    : candidate;

  if (!isRecord(resolved)) {
    issues.push({
      path: "mondoConfig",
      message: "The `mondoConfig` property must be an object when present.",
    });
    return { ok: false, issues };
  }

  const entities = resolved.entities;
  if (!isRecord(entities)) {
    issues.push({
      path: "entities",
      message:
        "`entities` must be an object containing the known entity definitions.",
    });
    return { ok: false, issues };
  }

  const entityKeys = Object.keys(entities);
  if (entityKeys.length === 0) {
    issues.push({
      path: "entities",
      message: "`entities` must include at least one definition.",
    });
  }

  let quickSearchEntitiesRaw: unknown = undefined;
  if ("quickSearch" in resolved) {
    const quickSearch = (resolved as Record<string, unknown>).quickSearch;
    if (quickSearch !== undefined) {
      if (!isRecord(quickSearch)) {
        issues.push({
          path: "quickSearch",
          message: "`quickSearch` must be an object when provided.",
        });
      } else if (
        "entities" in quickSearch &&
        !Array.isArray((quickSearch as Record<string, unknown>).entities)
      ) {
        issues.push({
          path: "quickSearch.entities",
          message: "`quickSearch.entities` must be an array when provided.",
        });
      } else {
        quickSearchEntitiesRaw = (quickSearch as Record<string, unknown>)
          .entities;
      }
    }
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

  const sanitizedEntities = cloneConfig(entities) as MondoEntityConfigRecord;
  // Apply minimal defaults/normalizations per-entity to avoid runtime crashes in UI
  for (const [ekey, evalue] of Object.entries(sanitizedEntities)) {
    if (evalue && typeof evalue === "object") {
      const rec = evalue as Record<string, unknown>;
      // Ensure `name` is a trimmed string if present
      if (typeof rec.name === "string") {
        rec.name = rec.name.trim();
      }
      // Provide a safe default icon when missing/invalid to prevent setIcon errors
      if (typeof rec.icon !== "string" || rec.icon.trim().length === 0) {
        rec.icon = "tag"; // lucide icon available in Obsidian
      }
    }
  }
  const resolvedTitlesOrder = isRecord(resolved.titles)
    ? (resolved.titles as Record<string, unknown>).order
    : undefined;
  const resolvedRelevantFilter =
    isRecord(resolved.relevantNotes) && isRecord(resolved.relevantNotes.filter)
      ? (resolved.relevantNotes.filter as Record<string, unknown>).order
      : undefined;
  const sanitizedQuickSearch = ensureSubset(
    quickSearchEntitiesRaw,
    entityKeys
  );
  const sanitized: MondoConfig = {
    titles: {
      order: ensureOrder(resolvedTitlesOrder, entityKeys),
    },
    relevantNotes: {
      filter: {
        order: ensureOrder(resolvedRelevantFilter, entityKeys),
      },
    },
    quickSearch: {
      entities: sanitizedQuickSearch,
    },
    entities: sanitizedEntities,
  };

  return { ok: true, config: sanitized };
};

const isJsonPath = (path: string) => path.toLowerCase().endsWith(".json");

const isJsonFile = (file: TAbstractFile): file is TFile =>
  file instanceof TFile && isJsonPath(file.path);

type MondoConfigManagerCallbacks = {
  onConfigNotePathChange?: (path: string | null) => void | Promise<void>;
};

type ConfigSource = "default" | "custom";

export class MondoConfigManager {
  private configFilePath: string | null = null;
  private readonly app: App;
  private readonly callbacks: MondoConfigManagerCallbacks;
  private eventRefs: EventRef[] = [];
  private lastSource: ConfigSource = "default";

  constructor(app: App, callbacks: MondoConfigManagerCallbacks = {}) {
    this.app = app;
    this.callbacks = callbacks;
  }

  initialize = async (configFilePath: string | null) => {
    const resolvedPath = this.normalizePath(configFilePath);
    if (resolvedPath && !isJsonPath(resolvedPath)) {
      console.log(
        `MondoConfigManager: invalid initial config path "${resolvedPath}" (must be .json)`
      );
      this.notifyInvalidExtension(resolvedPath);
      await this.callbacks.onConfigNotePathChange?.(null);
      this.applyDefaultConfig();
      return;
    }

    this.configFilePath = resolvedPath;
    console.log(
      `MondoConfigManager: initializing with ${
        this.configFilePath ?? "built-in defaults"
      }`
    );
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
      console.log(
        `MondoConfigManager: rejecting new config path "${resolvedPath}" (must be .json)`
      );
      this.notifyInvalidExtension(resolvedPath);
      await this.callbacks.onConfigNotePathChange?.(null);
      this.detachFileWatchers();
      this.configFilePath = null;
      this.applyDefaultConfig();
      return;
    }

    if (resolvedPath === this.configFilePath) {
      console.log("MondoConfigManager: config path unchanged, forcing reload");
      await this.reload();
      return;
    }

    this.detachFileWatchers();
    this.configFilePath = resolvedPath;

    if (!this.configFilePath) {
      console.log(
        "MondoConfigManager: cleared config path, reverting to defaults"
      );
      this.applyDefaultConfig();
      return;
    }

    const file = this.resolveJsonFile(this.configFilePath);
    if (!file) {
      this.notifyMissingFile(this.configFilePath);
      this.applyDefaultConfig();
      return;
    }

    console.log(`MondoConfigManager: applying config from ${file.path}`);
    this.attachFileWatchers(file);
    await this.applyConfigFromFile(file);
  };

  reload = async () => {
    if (!this.configFilePath) {
      console.log("MondoConfigManager: reload requested without config path");
      this.applyDefaultConfig();
      return;
    }

    const file = this.resolveJsonFile(this.configFilePath);
    if (!file) {
      this.notifyMissingFile(this.configFilePath);
      this.applyDefaultConfig();
      return;
    }

    console.log(`MondoConfigManager: reloading config from ${file.path}`);
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

    const handleModify = this.app.vault.on(
      "modify",
      (modified: TAbstractFile) => {
        if (!isJsonFile(modified)) {
          return;
        }
        if (modified.path === trackedFile.path) {
          void this.applyConfigFromFile(modified);
        }
      }
    );

    const handleDelete = this.app.vault.on(
      "delete",
      (deleted: TAbstractFile) => {
        if (!isJsonFile(deleted)) {
          return;
        }
        if (deleted.path === trackedFile.path) {
          this.detachFileWatchers();
          this.configFilePath = null;
          void this.callbacks.onConfigNotePathChange?.(null);
          new Notice(
            "Mondo configuration file deleted. Reverting to default configuration."
          );
          this.applyDefaultConfig();
        }
      }
    );

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
    const current = getMondoConfig();
    const fallback = cloneConfig(BASE_CONFIG) as MondoConfig;

    if (
      this.lastSource === "default" &&
      JSON.stringify(current) === JSON.stringify(fallback)
    ) {
      return;
    }

    setMondoConfig(fallback);
    this.lastSource = "default";
    console.log("MondoConfigManager: applied built-in default Mondo configuration");
    this.app.workspace.trigger("mondo:config-updated", {
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
        await this.handleInvalidConfig(
          file,
          [
            {
              path: "root",
              message: `Failed to parse JSON: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          content
        );
        return;
      }

      const validation = validateMondoConfig(parsed);
      if (!validation.ok) {
        await this.handleInvalidConfig(file, validation.issues, content);
        return;
      }

      setMondoConfig(validation.config);
      this.lastSource = "custom";
      console.log(
        `MondoConfigManager: loaded custom config from ${file.path} with ${
          Object.keys(validation.config.entities).length
        } entities`
      );
      this.app.workspace.trigger("mondo:config-updated", {
        source: "custom",
        notePath: file.path,
      });
    } catch (error) {
      console.error("Mondo: failed to read configuration file", error);
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

    console.warn(
      `MondoConfigManager: configuration at ${file.path} is invalid:\n${details}`
    );

    new Notice(
      "Mondo configuration file is invalid. See the generated error log for details."
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
      "The Mondo configuration file could not be loaded due to the following issues:",
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
      console.error("Mondo: failed to write config error log", error);
      try {
        const fallbackPath = `${timestamp}-mondo-config-error.md`;
        await this.app.vault.create(fallbackPath, entry);
      } catch (fallbackError) {
        console.error(
          "Mondo: failed to create fallback config error log",
          fallbackError
        );
      }
    }
  };

  private notifyMissingFile = (path: string) => {
    console.warn(`MondoConfigManager: configuration file not found: ${path}`);
    new Notice(`Mondo configuration file not found: ${path}`);
  };

  private notifyInvalidExtension = (path: string) => {
    console.warn(
      `MondoConfigManager: configuration file must be JSON (got ${path})`
    );
    new Notice(`Mondo configuration must be a JSON file (received: ${path}).`);
  };
}
