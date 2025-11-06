import type Mondo from "@/main";
import { DAILY_NOTE_TYPE, isDailyNoteType } from "@/types/MondoFileType";
import type { App, CachedMetadata, TAbstractFile } from "obsidian";
import { TFile } from "obsidian";

type DailyNoteState = Record<string, unknown> & {
  created: unknown;
  changed: unknown;
  opened: unknown;
};

const isAlreadyExistsError = (
  error: unknown,
  target: "folder" | "file"
): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = (error.message ?? "").toLowerCase();
  // Obsidian error messages can be "Folder already exists." / "File already exists."
  // Normalize case and detect both specific and generic variants.
  return (
    msg.includes(`${target} already exists`) || msg.includes("already exists")
  );
};

const normalizeFolder = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  if (value === "/") {
    return "";
  }
  return value.replace(/^\/+|\/+$/g, "");
};

const isInFolder = (path: string, folder: string): boolean => {
  if (!folder) {
    return true;
  }
  return path === folder || path.startsWith(`${folder}/`);
};

type LinkRecord = {
  raw: string;
  canonical: string;
  timestamp?: number;
};

// Helper to convert LinkRecord to the appropriate storage format:
// - New format with timestamp: { link: "[[Note]]", timestamp: 123456789 }
// - Legacy format without timestamp: "[[Note]]"
const serializeLinkRecord = (
  record: LinkRecord
): string | { link: string; timestamp: number } => {
  return typeof record.timestamp === "number"
    ? { link: record.raw, timestamp: record.timestamp }
    : record.raw;
};

const DATE_IN_TITLE_REGEX = /(\d{4})[-/](\d{2})[-/](\d{2})/;

export class DailyNoteTracker {
  private readonly plugin: Mondo;

  private readonly dailyNoteCache = new Map<string, string>();

  private readonly pendingCreatePaths = new Set<string>();

  private readonly pendingModifyPaths = new Set<string>();

  constructor(plugin: Mondo) {
    this.plugin = plugin;
  }

  public handleFileCreated = (abstract: TAbstractFile) => {
    if (!this.isMarkdownFile(abstract)) {
      return;
    }

    const file = abstract;
    if (this.shouldIgnorePath(file.path) || this.isDailyNoteFile(file)) {
      return;
    }

    const dateKey = this.resolveCreationDate(file);
    if (!dateKey) {
      return;
    }

    void this.recordCreatedNote(dateKey, file);
  };

  public handleFileModified = (abstract: TAbstractFile) => {
    if (!this.isMarkdownFile(abstract)) {
      return;
    }

    const file = abstract;
    if (this.pendingModifyPaths.has(file.path) || this.isDailyNoteFile(file)) {
      return;
    }

    const dateKey = this.resolveModificationDate(file);
    if (!dateKey) {
      return;
    }

    void this.recordChangedNote(dateKey, file);
  };

  private get app(): App {
    return this.plugin.app;
  }

  private isMarkdownFile = (abstract: TAbstractFile): abstract is TFile =>
    abstract instanceof TFile && abstract.extension === "md";

  private shouldIgnorePath = (path: string): boolean =>
    this.pendingCreatePaths.has(path) || this.pendingModifyPaths.has(path);

  private isDailyNoteFile = (file: TFile): boolean => {
    if (this.isKnownDailyNotePath(file.path)) {
      return true;
    }

    const dailyRoot = this.getDailyRoot();
    if (!isInFolder(file.path, dailyRoot)) {
      return false;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const type = this.readFrontmatterType(cache);
    if (!isDailyNoteType(type)) {
      return false;
    }

    const dateValue = this.readFrontmatterDate(cache);
    return Boolean(dateValue);
  };

  private isKnownDailyNotePath = (path: string): boolean => {
    for (const cachedPath of this.dailyNoteCache.values()) {
      if (cachedPath === path) {
        return true;
      }
    }
    return false;
  };

  private resolveCreationDate = (file: TFile): string | null => {
    const cache = this.app.metadataCache.getFileCache(file);

    const fromFrontmatter = this.readFrontmatterDate(cache);
    if (fromFrontmatter) {
      return fromFrontmatter;
    }

    const title = this.readTitle(cache) ?? file.basename;
    const fromTitle = this.parseDateFromText(title);
    if (fromTitle) {
      return fromTitle;
    }

    const createdAt = this.toDateSafe(file.stat?.ctime);
    return createdAt ? this.formatDateKey(createdAt) : null;
  };

  private resolveModificationDate = (file: TFile): string | null => {
    const modifiedAt = this.toDateSafe(file.stat?.mtime);
    return modifiedAt ? this.formatDateKey(modifiedAt) : null;
  };

  private toDateSafe = (value: number | undefined): Date | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  private readFrontmatterType = (
    cache: CachedMetadata | null | undefined
  ): string | null => {
    const raw =
      cache?.frontmatter?.mondoType ?? cache?.frontmatter?.type;
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().toLowerCase();
    }
    return null;
  };

  private readFrontmatterDate = (
    cache: CachedMetadata | null | undefined
  ): string | null => {
    const raw = cache?.frontmatter?.date;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = this.parseDateFromText(raw.trim());
      if (parsed) {
        return parsed;
      }
    }
    return null;
  };

  private readTitle = (
    cache: CachedMetadata | null | undefined
  ): string | null => {
    const title = cache?.frontmatter?.title;
    if (typeof title === "string" && title.trim()) {
      return title.trim();
    }
    const headings = cache?.headings;
    if (Array.isArray(headings) && headings.length > 0) {
      const heading = headings[0]?.heading;
      if (typeof heading === "string" && heading.trim()) {
        return heading.trim();
      }
    }
    return null;
  };

  private parseDateFromText = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return this.formatDateKey(direct);
    }

    const match = trimmed.match(DATE_IN_TITLE_REGEX);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return null;
    }

    const candidate = new Date(year, month - 1, day);
    if (Number.isNaN(candidate.getTime())) {
      return null;
    }

    return this.formatDateKey(candidate);
  };

  private formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  private getDailyRoot = (): string =>
    normalizeFolder((this.plugin as any).settings?.daily?.root ?? "Daily");

  private getDailyEntryFormat = (): string =>
    ((this.plugin as any).settings?.daily?.entry as string | undefined) ??
    "YYYY-MM-DD";

  private buildDailyNoteName = (dateKey: string): string => {
    const format = this.getDailyEntryFormat();
    const [year, month, day] = dateKey.split("-");
    const templateDate = new Date(Number(year), Number(month) - 1, Number(day));
    const pad = (value: number) => `${value}`.padStart(2, "0");
    const formatted = format
      .split("YYYY")
      .join(`${templateDate.getFullYear()}`)
      .split("MM")
      .join(pad(templateDate.getMonth() + 1))
      .split("DD")
      .join(pad(templateDate.getDate()));
    return formatted.endsWith(".md") ? formatted : `${formatted}.md`;
  };

  private getDailyNotePath = (dateKey: string): string => {
    const folder = this.getDailyRoot();
    const name = this.buildDailyNoteName(dateKey);
    return folder ? `${folder}/${name}` : name;
  };

  private locateDailyNote = (dateKey: string): TFile | null => {
    const cached = this.dailyNoteCache.get(dateKey);
    if (cached) {
      const abstract = this.app.vault.getAbstractFileByPath(cached);
      if (abstract instanceof TFile) {
        return abstract;
      }
      this.dailyNoteCache.delete(dateKey);
    }

    const dailyRoot = this.getDailyRoot();
    const files = this.app.vault.getMarkdownFiles();
    for (const candidate of files) {
      if (!isInFolder(candidate.path, dailyRoot)) {
        continue;
      }
      const cache = this.app.metadataCache.getFileCache(candidate);
      const type = this.readFrontmatterType(cache);
      if (!isDailyNoteType(type)) {
        continue;
      }
      const date = this.readFrontmatterDate(cache);
      if (date === dateKey) {
        this.dailyNoteCache.set(dateKey, candidate.path);
        return candidate;
      }
    }

    return null;
  };

  private ensureFolderExists = async (folder: string): Promise<void> => {
    if (!folder) {
      return;
    }
    const existing = this.app.vault.getAbstractFileByPath(folder);
    if (existing) {
      return;
    }
    try {
      await this.app.vault.createFolder(folder);
    } catch (error) {
      if (isAlreadyExistsError(error, "folder")) {
        return;
      }
      console.error("DailyNoteTracker: failed to create folder", error);
    }
  };

  private buildDailyNoteFrontmatter = (dateKey: string): string =>
    [
      "---",
      `type: ${DAILY_NOTE_TYPE}`,
      `date: ${dateKey}`,
      "mondoState:",
      "  created: []",
      "  changed: []",
      "  opened: []",
      "---",
      "",
    ].join("\n");

  private getOrCreateDailyNote = async (
    dateKey: string
  ): Promise<TFile | null> => {
    const existing = this.locateDailyNote(dateKey);
    if (existing) {
      return existing;
    }

    const path = this.getDailyNotePath(dateKey);
    await this.ensureFolderExists(this.getDailyRoot());

    let file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      this.dailyNoteCache.set(dateKey, file.path);
      return file;
    }

    this.pendingCreatePaths.add(path);
    try {
      const created = await this.app.vault.create(
        path,
        this.buildDailyNoteFrontmatter(dateKey)
      );
      if (created instanceof TFile) {
        this.dailyNoteCache.set(dateKey, created.path);
        return created;
      }
      return null;
    } catch (error) {
      if (isAlreadyExistsError(error, "file")) {
        const existingFile = this.app.vault.getAbstractFileByPath(path);
        if (existingFile instanceof TFile) {
          this.dailyNoteCache.set(dateKey, existingFile.path);
          return existingFile;
        }
        return null;
      }
      console.error("DailyNoteTracker: failed to create daily note", error);
      return null;
    } finally {
      this.pendingCreatePaths.delete(path);
    }
  };

  private ensureDailyNoteMetadata = (
    frontmatter: Record<string, unknown>,
    dateKey: string
  ) => {
    frontmatter.mondoType = DAILY_NOTE_TYPE;
    if (Object.prototype.hasOwnProperty.call(frontmatter, "type")) {
      delete (frontmatter as Record<string, unknown>).type;
    }
    frontmatter.date = dateKey;
  };

  private isPlainObject = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

  private ensureDailyNoteState = (
    frontmatter: Record<string, unknown>
  ): DailyNoteState => {
    if (!this.isPlainObject(frontmatter.mondoState)) {
      frontmatter.mondoState = {};
    }

    const state = frontmatter.mondoState as Record<string, unknown> & {
      created?: unknown;
      changed?: unknown;
      opened?: unknown;
      dailyNote?: unknown;
      createdToday?: unknown;
      changedToday?: unknown;
      modifiedToday?: unknown;
      openedToday?: unknown;
    };

    if (this.isPlainObject(state.dailyNote)) {
      const legacyDailyNote = state.dailyNote as Record<string, unknown> & {
        created?: unknown;
        createdToday?: unknown;
        changed?: unknown;
        changedToday?: unknown;
        modifiedToday?: unknown;
        opened?: unknown;
        openedToday?: unknown;
      };

      if (state.created === undefined) {
        state.created =
          legacyDailyNote.created ?? legacyDailyNote.createdToday ?? undefined;
      }
      if (state.changed === undefined) {
        state.changed =
          legacyDailyNote.changed ??
          legacyDailyNote.changedToday ??
          legacyDailyNote.modifiedToday ??
          undefined;
      }
      if (state.opened === undefined) {
        state.opened =
          legacyDailyNote.opened ?? legacyDailyNote.openedToday ?? undefined;
      }

      delete state.dailyNote;
    }

    if (state.createdToday !== undefined && state.created === undefined) {
      state.created = state.createdToday;
    }
    if (state.createdToday !== undefined) {
      delete state.createdToday;
    }

    const legacyFrontmatterCreated = frontmatter.createdToday;
    if (legacyFrontmatterCreated !== undefined && state.created === undefined) {
      state.created = legacyFrontmatterCreated;
    }
    if (legacyFrontmatterCreated !== undefined) {
      delete frontmatter.createdToday;
    }

    if (state.changedToday !== undefined && state.changed === undefined) {
      state.changed = state.changedToday;
    }
    if (state.changedToday !== undefined) {
      delete state.changedToday;
    }

    const legacyFrontmatterChanged = frontmatter.changedToday;
    if (legacyFrontmatterChanged !== undefined && state.changed === undefined) {
      state.changed = legacyFrontmatterChanged;
    }
    if (legacyFrontmatterChanged !== undefined) {
      delete frontmatter.changedToday;
    }

    const legacyFrontmatterModified = frontmatter.modifiedToday;
    if (legacyFrontmatterModified !== undefined && state.changed === undefined) {
      state.changed = legacyFrontmatterModified;
    }
    if (legacyFrontmatterModified !== undefined) {
      delete frontmatter.modifiedToday;
    }

    if (state.modifiedToday !== undefined && state.changed === undefined) {
      state.changed = state.modifiedToday;
    }
    if (state.modifiedToday !== undefined) {
      delete state.modifiedToday;
    }

    if (state.openedToday !== undefined && state.opened === undefined) {
      state.opened = state.openedToday;
    }
    if (state.openedToday !== undefined) {
      delete state.openedToday;
    }

    const legacyFrontmatterOpened = frontmatter.openedToday;
    if (legacyFrontmatterOpened !== undefined && state.opened === undefined) {
      state.opened = legacyFrontmatterOpened;
    }
    if (legacyFrontmatterOpened !== undefined) {
      delete frontmatter.openedToday;
    }

    state.created = this.normalizeLinkArray(state.created);
    state.changed = this.normalizeLinkArray(state.changed);
    state.opened = this.normalizeLinkArray(state.opened);

    return state as DailyNoteState;
  };

  private normalizeLinkArray = (
    value: unknown
  ): Array<string | { link: string; timestamp?: number }> => {
    if (value === undefined) {
      return [];
    }

    const rawValues = Array.isArray(value) ? value : [value];
    const normalized: Array<string | { link: string; timestamp?: number }> = [];

    rawValues.forEach((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) {
          normalized.push(trimmed);
        }
        return;
      }

      if (entry && typeof entry === "object") {
        const objectValue = entry as Record<string, unknown>;
        const maybeLink =
          objectValue.link ?? objectValue.raw ?? objectValue.value;
        if (typeof maybeLink === "string") {
          const trimmed = maybeLink.trim();
          if (trimmed) {
            const hasTimestamp =
              typeof objectValue.timestamp === "number" &&
              !Number.isNaN(objectValue.timestamp);
            if (hasTimestamp) {
              normalized.push({
                link: trimmed,
                timestamp: objectValue.timestamp as number,
              });
            } else {
              normalized.push(trimmed);
            }
          }
        }
      }
    });

    return normalized;
  };

  private extractLinkRecords = (
    frontmatter: Record<string, unknown>,
    key: string,
    sourcePath: string
  ): { records: LinkRecord[]; set: Set<string> } => {
    const raw = frontmatter[key];
    const entries: Array<{ value: string; timestamp?: number }> = [];

    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        // New format: { link: "[[Note]]", timestamp: 123456789 }
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          const link = obj.link ?? obj.raw ?? obj.value;
          if (typeof link === "string" && link.trim()) {
            const timestamp = typeof obj.timestamp === "number" ? obj.timestamp : undefined;
            entries.push({ value: link.trim(), timestamp });
          }
        }
        // Legacy format: string values
        else if (typeof item === "string" && item.trim()) {
          entries.push({ value: item.trim() });
        }
      });
    } else if (typeof raw === "string" && raw.trim()) {
      entries.push({ value: raw.trim() });
    }

    const records: LinkRecord[] = [];
    const seen = new Set<string>();

    entries.forEach(({ value, timestamp }) => {
      const canonical = this.resolveLinkCanonical(value, sourcePath);
      if (!canonical || seen.has(canonical)) {
        return;
      }
      seen.add(canonical);
      records.push({ raw: value, canonical, timestamp });
    });

    return { records, set: seen };
  };

  private extractOpenedRecords = (
    frontmatter: Record<string, unknown>,
    key: string,
    sourcePath: string
  ): { records: LinkRecord[]; set: Set<string> } => {
    const raw = frontmatter[key];

    const values: unknown[] = [];
    if (Array.isArray(raw)) {
      raw.forEach((value) => {
        if (typeof value === "string" || (value && typeof value === "object")) {
          values.push(value);
        }
      });
    } else if (typeof raw === "string") {
      values.push(raw);
    }

    const records: LinkRecord[] = [];
    const set = new Set<string>();

    values.forEach((value) => {
      let link: string | null = null;
      let timestamp: number | undefined = undefined;

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) {
          link = trimmed;
        }
      } else if (value && typeof value === "object") {
        const objectValue = value as Record<string, unknown>;
        const maybeLink = objectValue.link ?? objectValue.raw ?? objectValue.value;
        if (typeof maybeLink === "string") {
          const trimmed = maybeLink.trim();
          if (trimmed) {
            link = trimmed;
          }
        }
        // Extract timestamp if present
        if (typeof objectValue.timestamp === "number") {
          timestamp = objectValue.timestamp;
        }
      }

      if (!link) {
        return;
      }

      const canonical = this.resolveLinkCanonical(link, sourcePath);
      if (!canonical || set.has(canonical)) {
        return;
      }

      set.add(canonical);
      records.push({ raw: link, canonical, timestamp });
    });

    return { records, set };
  };

  private resolveLinkCanonical = (
    raw: string,
    sourcePath: string
  ): string | null => {
    let inner = raw.trim();
    if (!inner) {
      return null;
    }
    if (inner.startsWith("[[") && inner.endsWith("]]")) {
      inner = inner.slice(2, -2);
    }

    const pipeIndex = inner.indexOf("|");
    if (pipeIndex >= 0) {
      inner = inner.slice(0, pipeIndex);
    }

    const hashIndex = inner.indexOf("#");
    if (hashIndex >= 0) {
      inner = inner.slice(0, hashIndex);
    }

    const target = inner.trim();
    if (!target) {
      return null;
    }

    const resolved = this.app.metadataCache.getFirstLinkpathDest(
      target,
      sourcePath
    );
    if (resolved) {
      return resolved.path;
    }

    const direct = this.app.vault.getAbstractFileByPath(target);
    if (direct instanceof TFile) {
      return direct.path;
    }

    const withExtension = target.endsWith(".md") ? target : `${target}.md`;
    const fallback = this.app.vault.getAbstractFileByPath(withExtension);
    if (fallback instanceof TFile) {
      return fallback.path;
    }

    return target;
  };

  private buildWikiLink = (file: TFile, sourcePath: string): string => {
    const linktext = this.app.metadataCache.fileToLinktext(
      file,
      sourcePath,
      false
    );
    return `[[${linktext}]]`;
  };

  private withSuppressedModify = async (
    path: string,
    task: () => Promise<void>
  ) => {
    this.pendingModifyPaths.add(path);
    try {
      await task();
    } finally {
      this.pendingModifyPaths.delete(path);
    }
  };

  private recordCreatedNote = async (
    dateKey: string,
    file: TFile
  ): Promise<void> => {
    try {
      const dailyNote = await this.getOrCreateDailyNote(dateKey);
      if (!dailyNote) {
        return;
      }

      const sourcePath = dailyNote.path;
      const wikiLink = this.buildWikiLink(file, sourcePath);
      const timestamp = Date.now();

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);
            const state = this.ensureDailyNoteState(frontmatter);

            const created = this.extractLinkRecords(
              state,
              "created",
              sourcePath
            );
            const changed = this.extractLinkRecords(
              state,
              "changed",
              sourcePath
            );

            if (!created.set.has(file.path)) {
              created.records.push({ raw: wikiLink, canonical: file.path, timestamp });
              created.set.add(file.path);
            }

            const filteredChanged = changed.records.filter(
              (record) => record.canonical !== file.path
            );

            state.created = created.records.map(serializeLinkRecord);
            state.changed = filteredChanged.map(serializeLinkRecord);
          }
        );
      });
    } catch (error) {
      console.error("DailyNoteTracker: failed to record created note", error);
    }
  };

  private recordChangedNote = async (
    dateKey: string,
    file: TFile
  ): Promise<void> => {
    try {
      const dailyNote = await this.getOrCreateDailyNote(dateKey);
      if (!dailyNote) {
        return;
      }

      const sourcePath = dailyNote.path;
      const wikiLink = this.buildWikiLink(file, sourcePath);
      const timestamp = Date.now();

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);
            const state = this.ensureDailyNoteState(frontmatter);

            const created = this.extractLinkRecords(
              state,
              "created",
              sourcePath
            );
            const changed = this.extractLinkRecords(
              state,
              "changed",
              sourcePath
            );

            if (created.set.has(file.path)) {
              state.created = created.records.map(serializeLinkRecord);
              state.changed = changed.records
                .filter((record) => record.canonical !== file.path)
                .map(serializeLinkRecord);
              return;
            }

            if (!changed.set.has(file.path)) {
              changed.records.push({ raw: wikiLink, canonical: file.path, timestamp });
              changed.set.add(file.path);
            }

            state.created = created.records.map(serializeLinkRecord);
            state.changed = changed.records.map(serializeLinkRecord);
          }
        );
      });
    } catch (error) {
      console.error("DailyNoteTracker: failed to record changed note", error);
    }
  };

  private recordOpenedNote = async (
    dateKey: string,
    file: TFile
  ): Promise<void> => {
    try {
      const dailyNote = await this.getOrCreateDailyNote(dateKey);
      if (!dailyNote) {
        return;
      }

      const sourcePath = dailyNote.path;
      const wikiLink = this.buildWikiLink(file, sourcePath);
      const timestamp = Date.now();

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);
            const state = this.ensureDailyNoteState(frontmatter);

            const opened = this.extractOpenedRecords(
              state,
              "opened",
              sourcePath
            );

            if (!opened.set.has(file.path)) {
              opened.records.push({ raw: wikiLink, canonical: file.path, timestamp });
              opened.set.add(file.path);
            }

            state.opened = opened.records.map(serializeLinkRecord);
          }
        );
      });
    } catch (error) {
      console.error("DailyNoteTracker: failed to record opened note", error);
    }
  };

  public handleFileOpened = (file: TFile | null) => {
    if (!file || file.extension !== "md") {
      return;
    }

    if (this.isDailyNoteFile(file)) {
      return;
    }

    const dateKey = this.formatDateKey(new Date());
    void this.recordOpenedNote(dateKey, file);
  };
}

export default DailyNoteTracker;
