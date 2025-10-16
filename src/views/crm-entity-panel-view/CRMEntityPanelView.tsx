import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { createOrOpenEntity } from "@/utils/createOrOpenEntity";
import { Modal, type App } from "obsidian";
import { useCRMEntityPanel } from "./useCRMEntityPanel";
import { EntityGrid } from "./components/EntityGrid";

const formatEntityLabel = (value: string): string => {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "Entity";
  }

  return normalized
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

type EntityNamePromptOptions = {
  app: App;
  entityLabel: string;
  placeholder: string;
  confirmLabel: string;
};

const promptForEntityName = ({
  app,
  entityLabel,
  placeholder,
  confirmLabel,
}: EntityNamePromptOptions): Promise<string | null> =>
  new Promise((resolve) => {
    let hasResolved = false;

    class EntityNameModal extends Modal {
      private inputEl: HTMLInputElement | null = null;

      private readonly submit = () => {
        const raw = this.inputEl?.value ?? "";
        const trimmed = raw.trim();
        if (!trimmed) {
          this.inputEl?.focus();
          return;
        }

        hasResolved = true;
        resolve(trimmed);
        this.close();
      };

      onOpen = () => {
        this.titleEl.setText(`Create ${entityLabel}`);
        this.modalEl.addClass("crm-entity-create-modal");

        const container = this.contentEl.createDiv(
          "crm-entity-create-modal__content"
        );

        const input = container.createEl("input", {
          type: "text",
          cls: "setting-input w-full",
        });
        input.placeholder = placeholder;
        input.value = "";
        this.inputEl = input;

        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            this.inputEl?.focus();
          }, 0);
        } else {
          this.inputEl?.focus();
        }

        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            this.submit();
          }
        });

        const actions = container.createDiv(
          "crm-entity-create-modal__actions flex justify-end gap-2 pt-4"
        );

        const cancelButton = actions.createEl("button", {
          type: "button",
          cls: "crm-button",
        });
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", (event) => {
          event.preventDefault();
          this.close();
        });

        const confirmButton = actions.createEl("button", {
          type: "button",
          cls: "crm-button mod-cta",
        });
        confirmButton.textContent = confirmLabel;
        confirmButton.addEventListener("click", (event) => {
          event.preventDefault();
          this.submit();
        });
      };

      onClose = () => {
        if (!hasResolved) {
          resolve(null);
        }
        this.contentEl.empty();
        this.modalEl.removeClass("crm-entity-create-modal");
      };
    }

    const modal = new EntityNameModal(app);
    modal.open();
  });

type CRMEntityPanelViewProps = {
  entityType: CRMFileType;
};

export const CRMEntityPanelView: FC<CRMEntityPanelViewProps> = ({ entityType }) => {
  const { columns, rows } = useCRMEntityPanel(entityType);
  const config = getCRMEntityConfig(entityType);
  const title = config?.name ?? entityType;
  const helper = config?.dashboard.helper ?? "";
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const entityLabel = useMemo(
    () => formatEntityLabel(config?.type ?? entityType),
    [config?.type, entityType]
  );
  const buttonLabel = useMemo(
    () => `+ New ${entityLabel}`,
    [entityLabel]
  );
  const promptPlaceholder = useMemo(
    () => `Enter ${entityLabel} name`,
    [entityLabel]
  );
  const confirmLabel = useMemo(
    () => `Create ${entityLabel}`,
    [entityLabel]
  );

  const onCreateEntity = useCallback(async () => {
    if (isCreating) {
      return;
    }

    const name = await promptForEntityName({
      app,
      entityLabel,
      placeholder: promptPlaceholder,
      confirmLabel,
    });

    if (!name) {
      return;
    }

    setIsCreating(true);
    try {
      await createOrOpenEntity({
        app,
        entityType,
        title: name,
      });
    } catch (error) {
      console.error("CRMEntityPanelView: failed to create entity", error);
    } finally {
      setIsCreating(false);
    }
  }, [
    app,
    confirmLabel,
    entityLabel,
    entityType,
    isCreating,
    promptPlaceholder,
  ]);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{title}</h1>
          {helper && (
            <span className="text-xs text-[var(--text-muted)]">{helper}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onCreateEntity} disabled={isCreating}>
            {buttonLabel}
          </Button>
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
