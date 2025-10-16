import type { CSSProperties, FC, FormEvent, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { createOrOpenEntity } from "@/utils/createOrOpenEntity";
import { createPortal } from "react-dom";
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

type EntityCreatePopoverProps = {
  anchorRef: RefObject<HTMLButtonElement | null>;
  confirmLabel: string;
  entityLabel: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onConfirm: () => void;
  placeholder: string;
  value: string;
};

const EntityCreatePopover: FC<EntityCreatePopoverProps> = ({
  anchorRef,
  confirmLabel,
  entityLabel,
  isOpen,
  isSubmitting,
  onCancel,
  onChange,
  onConfirm,
  placeholder,
  value,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    if (typeof window === "undefined") {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    const handle = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    }, 0);

    return () => {
      window.clearTimeout(handle);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const updatePosition = () => {
      const anchorEl = anchorRef.current;
      const popoverEl = popoverRef.current;
      if (!anchorEl || !popoverEl) {
        return;
      }

      const anchorRect = anchorEl.getBoundingClientRect();
      const { offsetWidth, offsetHeight } = popoverEl;
      const margin = 12;
      const scrollX = window.scrollX ?? window.pageXOffset;
      const scrollY = window.scrollY ?? window.pageYOffset;
      const viewportWidth =
        window.innerWidth ?? document.documentElement.clientWidth;
      const viewportHeight =
        window.innerHeight ?? document.documentElement.clientHeight;

      let left = anchorRect.right - offsetWidth + scrollX;
      const minLeft = margin + scrollX;
      if (left < minLeft) {
        left = Math.max(anchorRect.left + scrollX, minLeft);
      }
      const maxLeft = viewportWidth + scrollX - margin - offsetWidth;
      if (left > maxLeft) {
        left = Math.max(minLeft, maxLeft);
      }

      let top = anchorRect.bottom + margin + scrollY;
      const maxTop = viewportHeight + scrollY - margin - offsetHeight;
      if (top > maxTop) {
        top = Math.max(
          margin + scrollY,
          anchorRect.top + scrollY - offsetHeight - margin
        );
      }

      setPosition({ left, top });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (popoverRef.current?.contains(target)) {
        return;
      }

      if (anchorRef.current?.contains(target as Node)) {
        return;
      }

      onCancel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, isOpen, onCancel]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!value.trim() || isSubmitting) {
        return;
      }
      onConfirm();
    },
    [isSubmitting, onConfirm, value]
  );

  const portalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  if (!isOpen || !portalTarget) {
    return null;
  }

  const style: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { visibility: "hidden" };

  const canConfirm = Boolean(value.trim()) && !isSubmitting;

  const content = (
    <div
      ref={popoverRef}
      className="crm-entity-create-popover fixed z-[1000] w-[min(320px,calc(100vw-32px))] max-w-[calc(100vw-32px)] rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-4 shadow-lg"
      style={style}
      role="dialog"
      aria-modal="false"
      aria-label={`Create ${entityLabel}`}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Create {entityLabel}</h2>
          <input
            ref={inputRef}
            className="setting-input w-full"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="crm-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-button mod-cta"
            disabled={!canConfirm}
          >
            {isSubmitting ? "Creating…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(content, portalTarget);
};

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
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

  const openPopover = useCallback(() => {
    setPendingName("");
    setIsPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setPendingName("");
  }, []);

  const handleTriggerClick = useCallback(() => {
    openPopover();
  }, [openPopover]);

  const handleCancel = useCallback(() => {
    if (isCreating) {
      return;
    }
    closePopover();
  }, [closePopover, isCreating]);

  const handleConfirm = useCallback(async () => {
    const name = pendingName.trim();
    if (!name || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      await createOrOpenEntity({
        app,
        entityType,
        title: name,
      });
      closePopover();
    } catch (error) {
      console.error("CRMEntityPanelView: failed to create entity", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, closePopover, entityType, isCreating, pendingName]);

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
          <Button
            ref={triggerRef}
            onClick={handleTriggerClick}
            disabled={isCreating}
            aria-haspopup="dialog"
            aria-expanded={isPopoverOpen}
          >
            {buttonLabel}
          </Button>
          <span className="text-sm text-[var(--text-muted)]">
            {rows.length} files
          </span>
        </div>
      </header>
      <EntityCreatePopover
        anchorRef={triggerRef}
        confirmLabel={confirmLabel}
        entityLabel={entityLabel}
        isOpen={isPopoverOpen}
        isSubmitting={isCreating}
        onCancel={handleCancel}
        onChange={setPendingName}
        onConfirm={handleConfirm}
        placeholder={promptPlaceholder}
        value={pendingName}
      />
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
