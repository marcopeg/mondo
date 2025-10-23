import type CRM from "@/main";
import { DAILY_NOTE_TYPE, isDailyNoteType } from "@/types/CRMFileType";
import type { App, CachedMetadata, TAbstractFile } from "obsidian";
import { TFile } from "obsidian";

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
};

const DATE_IN_TITLE_REGEX = /(\d{4})[-/](\d{2})[-/](\d{2})/;

export class DailyNoteTracker {
  private readonly plugin: CRM;

  private readonly dailyNoteCache = new Map<string, string>();

  private readonly pendingCreatePaths = new Set<string>();

  private readonly pendingModifyPaths = new Set<string>();

  constructor(plugin: CRM) {
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

    const inboxRoot = this.getInboxRoot();
    if (!isInFolder(file.path, inboxRoot)) {
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
    const raw = cache?.frontmatter?.type;
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

  private getInboxRoot = (): string =>
    normalizeFolder((this.plugin as any).settings?.inbox ?? "Inbox");

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
    const folder = this.getInboxRoot();
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

    const inboxRoot = this.getInboxRoot();
    const files = this.app.vault.getMarkdownFiles();
    for (const candidate of files) {
      if (!isInFolder(candidate.path, inboxRoot)) {
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
      "createdToday: []",
      "changedToday: []",
      "openedToday: []",
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
    await this.ensureFolderExists(this.getInboxRoot());

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
    frontmatter.type = DAILY_NOTE_TYPE;
    frontmatter.date = dateKey;
  };

  private extractLinkRecords = (
    frontmatter: Record<string, unknown>,
    key: string,
    sourcePath: string
  ): { records: LinkRecord[]; set: Set<string> } => {
    const raw = frontmatter[key];
    const values: string[] = [];

    if (Array.isArray(raw)) {
      raw.forEach((value) => {
        if (typeof value === "string" && value.trim()) {
          values.push(value.trim());
        }
      });
    } else if (typeof raw === "string" && raw.trim()) {
      values.push(raw.trim());
    }

    const records: LinkRecord[] = [];
    const seen = new Set<string>();

    values.forEach((value) => {
      const canonical = this.resolveLinkCanonical(value, sourcePath);
      if (!canonical || seen.has(canonical)) {
        return;
      }
      seen.add(canonical);
      records.push({ raw: value, canonical });
    });

    return { records, set: seen };
  };

  private extractOpenedRecords = (
    frontmatter: Record<string, unknown>,
    key: string,
    sourcePath: string
  ): { records: (LinkRecord & { count: number })[]; map: Map<string, LinkRecord & { count: number }> } => {
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

    const records: (LinkRecord & { count: number })[] = [];
    const map = new Map<string, LinkRecord & { count: number }>();

    values.forEach((value) => {
      let link: string | null = null;
      let count = 1;

      if (typeof value === "string") {
        link = value.trim();
      } else if (value && typeof value === "object") {
        const objectValue = value as Record<string, unknown>;
        const maybeLink = objectValue.link ?? objectValue.raw ?? objectValue.value;
        if (typeof maybeLink === "string" && maybeLink.trim()) {
          link = maybeLink.trim();
        }
        const maybeCount = objectValue.count;
        if (typeof maybeCount === "number" && Number.isFinite(maybeCount)) {
          const normalized = Math.floor(maybeCount);
          if (normalized > 0) {
            count = normalized;
          }
        } else if (typeof maybeCount === "string") {
          const parsed = Number.parseInt(maybeCount, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            count = parsed;
          }
        }
      }

      if (!link) {
        return;
      }

      const canonical = this.resolveLinkCanonical(link, sourcePath);
      if (!canonical) {
        return;
      }

      const existing = map.get(canonical);
      if (existing) {
        existing.count += count;
        return;
      }

      const record = { raw: link, canonical, count };
      records.push(record);
      map.set(canonical, record);
    });

    return { records, map };
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

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);

            const created = this.extractLinkRecords(
              frontmatter,
              "createdToday",
              sourcePath
            );
            const changed = this.extractLinkRecords(
              frontmatter,
              "changedToday",
              sourcePath
            );

            if (!created.set.has(file.path)) {
              created.records.push({ raw: wikiLink, canonical: file.path });
              created.set.add(file.path);
            }

            const filteredChanged = changed.records.filter(
              (record) => record.canonical !== file.path
            );

            frontmatter.createdToday = created.records.map(
              (record) => record.raw
            );
            frontmatter.changedToday = filteredChanged.map(
              (record) => record.raw
            );
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

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);

            const created = this.extractLinkRecords(
              frontmatter,
              "createdToday",
              sourcePath
            );
            const changed = this.extractLinkRecords(
              frontmatter,
              "changedToday",
              sourcePath
            );

            if (created.set.has(file.path)) {
              frontmatter.createdToday = created.records.map(
                (record) => record.raw
              );
              frontmatter.changedToday = changed.records
                .filter((record) => record.canonical !== file.path)
                .map((record) => record.raw);
              return;
            }

            if (!changed.set.has(file.path)) {
              changed.records.push({ raw: wikiLink, canonical: file.path });
              changed.set.add(file.path);
            }

            frontmatter.createdToday = created.records.map(
              (record) => record.raw
            );
            frontmatter.changedToday = changed.records.map(
              (record) => record.raw
            );
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

      await this.withSuppressedModify(sourcePath, async () => {
        await this.app.fileManager.processFrontMatter(
          dailyNote,
          (frontmatter) => {
            this.ensureDailyNoteMetadata(frontmatter, dateKey);

            const opened = this.extractOpenedRecords(
              frontmatter,
              "openedToday",
              sourcePath
            );

            const existing = opened.map.get(file.path);
            if (existing) {
              existing.count += 1;
            } else {
              const record = {
                raw: wikiLink,
                canonical: file.path,
                count: 1,
              };
              opened.records.push(record);
              opened.map.set(file.path, record);
            }

            frontmatter.openedToday = opened.records.map((record) => ({
              link: record.raw,
              count: record.count,
            }));
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
