import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import type { App } from "obsidian";
import { Notice, TFile } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { addParticipantLink } from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";
import { useEntityPanels } from "./useEntityPanels";
import { EntityGrid } from "./components/EntityGrid";

type CreateEntityFileOptions = {
  app: App;
  entityType: CRMFileType;
  title: string;
};

type CreateEntityFileResult = {
  file: TFile;
  created: boolean;
};

// Focuses the title element (inline title or input) and selects all its content
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;

  // 1) Try inline title (contenteditable element)
  const inlineTitleEl: HTMLElement | null =
    view?.contentEl?.querySelector?.(".inline-title") ??
    view?.containerEl?.querySelector?.(".inline-title") ??
    null;
  if (inlineTitleEl) {
    inlineTitleEl.focus();
    try {
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(inlineTitleEl);
        selection.addRange(range);
      }
    } catch (_) {
      // no-op if selection APIs are unavailable
    }
    return true;
  }

  // 2) Try title input (when inline title is configured as an input)
  const titleInput: HTMLInputElement | undefined =
    view?.fileView?.inputEl ?? view?.titleEl?.querySelector?.("input");
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
    return true;
  }

  // 3) Fallback: trigger rename command (opens rename UI)
  const executed = (
    view?.app ?? (window as any)?.app
  )?.commands?.executeCommandById?.("app:rename-file");
  return Boolean(executed);
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureFolderExists = async (app: App, folderPath: string) => {
  if (!folderPath) {
    return;
  }

  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (!existing) {
    try {
      await app.vault.createFolder(folderPath);
    } catch (error) {
      const message = (error as Error).message ?? "";
      if (!message.toLowerCase().includes("already exists")) {
        throw error;
      }
    }
  }
};

const buildEntityLabel = (entityType: CRMFileType) =>
  entityType
    .split(/[-_\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");

const createEntityFile = async ({
  app,
  entityType,
  title,
}: CreateEntityFileOptions): Promise<CreateEntityFileResult> => {
  const pluginInstance = (app as any)?.plugins?.plugins?.crm as
    | { settings?: Record<string, unknown> }
    | undefined;
  const settings = (pluginInstance?.settings ?? {}) as Record<string, unknown>;
  const rootPaths = (settings.rootPaths ?? {}) as Partial<
    Record<CRMFileType, string>
  >;
  const templates = (settings.templates ?? {}) as Partial<
    Record<CRMFileType, string>
  >;

  const folderSetting = rootPaths[entityType] ?? "/";
  const normalizedFolder = normalizeFolderPath(folderSetting);

  if (normalizedFolder) {
    await ensureFolderExists(app, normalizedFolder);
  }

  const baseTitle = title.trim() || "Untitled";
  const sanitizedBase = baseTitle.replace(/[\\/]+/g, "-");
  const defaultName = sanitizedBase.endsWith(".md")
    ? sanitizedBase
    : `${sanitizedBase}.md`;

  const buildPath = (name: string) =>
    normalizedFolder ? `${normalizedFolder}/${name}` : name;

  const fileName = defaultName;
  const filePath = buildPath(fileName);

  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof TFile) {
    return { file: existing, created: false };
  }

  const slug = slugify(baseTitle) || sanitizedBase.toLowerCase();
  const isoTimestamp = new Date().toISOString();
  const templateSource = await getTemplateForType(app, templates, entityType);
  const content = renderTemplate(templateSource ?? "", {
    title: baseTitle,
    type: String(entityType),
    filename: fileName,
    slug,
    date: isoTimestamp.split("T")[0],
    time: isoTimestamp.slice(11, 16),
    datetime: isoTimestamp,
  });

  const createdFile = await app.vault.create(filePath, content);

  if (entityType === CRMFileType.TASK) {
    try {
      const selfParticipant = resolveSelfPerson(app, createdFile.path);
      if (selfParticipant) {
        await addParticipantLink(app, createdFile, selfParticipant.link);
      }
    } catch (error) {
      console.error(
        "EntityView: failed to assign self participant to new task",
        error
      );
    }
  }

  return { file: createdFile, created: true };
};

type EntityViewProps = {
  entityType: CRMFileType;
};

export const EntityView: FC<EntityViewProps> = ({ entityType }) => {
  const app = useApp();
  const { columns, rows } = useEntityPanels(entityType);
  const config = getCRMEntityConfig(entityType);
  const title = config?.name ?? entityType;
  const entityLabel = useMemo(() => buildEntityLabel(entityType), [entityType]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = useCallback(async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const titleForEntity = `Untitled ${entityLabel}`;
      const { file, created } = await createEntityFile({
        app,
        entityType,
        title: titleForEntity,
      });

      const leaf = app.workspace.getLeaf(true);
      if (leaf) {
        await (leaf as any).openFile(file);
      }

      if (created && leaf) {
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === file.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("EntityView: failed to create entity file", error);
      new Notice("Failed to create the new entity note.");
    } finally {
      setIsCreating(false);
    }
  }, [app, entityLabel, entityType, isCreating]);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-1 text-sm font-medium text-[var(--text-normal)] shadow-sm hover:bg-[var(--background-modifier-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleCreateNew}
            disabled={isCreating}
          >
            <span className="text-base leading-none">+</span>
            <span>New</span>
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            {rows.length} files
          </span>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="text-sm text-[var(--text-muted)]">
          No files found for this type yet.
        </div>
      ) : (
        <EntityGrid columns={columns} rows={rows} />
      )}
    </div>
  );
};
