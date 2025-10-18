import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import type { App, TFile } from "obsidian";
import { Modal, Notice } from "obsidian";
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
}: CreateEntityFileOptions): Promise<TFile> => {
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

  let fileName = defaultName;
  let filePath = buildPath(fileName);
  let counter = 1;

  while (app.vault.getAbstractFileByPath(filePath)) {
    const nameWithoutExt = defaultName.replace(/\.md$/i, "");
    fileName = `${nameWithoutExt}-${counter}.md`;
    filePath = buildPath(fileName);
    counter += 1;
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

  return createdFile;
};

class CreateEntityModal extends Modal {
  private readonly entityLabel: string;

  private readonly resolveFn: (value: string | null) => void;

  private inputEl: HTMLInputElement | null = null;

  private hasResolved = false;

  constructor(app: App, entityLabel: string, resolve: (value: string | null) => void) {
    super(app);
    this.entityLabel = entityLabel;
    this.resolveFn = resolve;
  }

  onOpen = () => {
    this.hasResolved = false;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("crm-entity-create-modal");

    contentEl.createEl("h2", { text: `New ${this.entityLabel}` });

    const form = contentEl.createEl("form", {
      cls: "crm-entity-create-modal__form",
    });

    const input = form.createEl("input", {
      type: "text",
      placeholder: `${this.entityLabel} name`,
      cls: "setting-input",
    });
    this.inputEl = input;

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 10);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeWith(null);
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) {
        new Notice(`Please enter a ${this.entityLabel.toLowerCase()} name.`);
        return;
      }
      this.closeWith(value);
    });

    const actions = form.createDiv({
      cls: "crm-entity-create-modal__actions flex justify-end gap-2",
    });

    const cancelButton = actions.createEl("button", {
      type: "button",
      text: "Cancel",
      cls: "mod-cancel",
    });
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.closeWith(null);
    });

    const createButton = actions.createEl("button", {
      type: "submit",
      text: "Create",
      cls: "mod-cta",
    });
    createButton.addClass("mod-cta");
  };

  onClose = () => {
    this.contentEl.empty();
    this.inputEl = null;
    if (!this.hasResolved) {
      this.resolveFn(null);
    }
  };

  private closeWith = (value: string | null) => {
    this.hasResolved = true;
    this.resolveFn(value);
    this.close();
  };
}

const promptForEntityTitle = (
  app: App,
  entityLabel: string
): Promise<string | null> =>
  new Promise((resolve) => {
    const modal = new CreateEntityModal(app, entityLabel, resolve);
    modal.open();
  });

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

    const titleInput = await promptForEntityTitle(app, entityLabel);
    if (!titleInput) {
      return;
    }

    setIsCreating(true);

    try {
      const created = await createEntityFile({
        app,
        entityType,
        title: titleInput,
      });

      const leaf = app.workspace.getLeaf(true);
      if (leaf) {
        await (leaf as any).openFile(created);
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
