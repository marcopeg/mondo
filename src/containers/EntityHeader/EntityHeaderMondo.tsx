import { useCallback, useMemo } from "react";
import type { RefObject } from "react";
import { Notice } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import { resolveCoverImage } from "@/utils/resolveCoverImage";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import {
  useEntityLinksLayout,
  type CollapsedPanelSummary,
} from "@/context/EntityLinksLayoutContext";

type EntityHeaderMondoProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  entityType: MondoEntityType;
};

type PanelAction = {
  key: string;
  label: string;
  icon?: string;
  panel: string;
  ariaLabel: string;
};

type PanelActionMap = Partial<Record<MondoEntityType, PanelAction[]>>;

const PANEL_ACTIONS: PanelActionMap = {
  person: [
    {
      key: "meeting",
      label: "Meeting",
      icon: "calendar-plus",
      panel: "meetings",
      ariaLabel: "Create meeting",
    },
    {
      key: "project",
      label: "Project",
      icon: "folder-plus",
      panel: "projects",
      ariaLabel: "Create project",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  company: [
    {
      key: "person",
      label: "Person",
      icon: "user-plus",
      panel: "employees",
      ariaLabel: "Create person",
    },
    {
      key: "team",
      label: "Team",
      icon: "users",
      panel: "teams",
      ariaLabel: "Create team",
    },
    {
      key: "project",
      label: "Project",
      icon: "folder-plus",
      panel: "projects",
      ariaLabel: "Create project",
    },
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panel: "company-tasks",
      ariaLabel: "Create task",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  team: [
    {
      key: "person",
      label: "Person",
      icon: "user-plus",
      panel: "team-members",
      ariaLabel: "Create person",
    },
    {
      key: "project",
      label: "Project",
      icon: "folder-plus",
      panel: "projects",
      ariaLabel: "Create project",
    },
    {
      key: "meeting",
      label: "Meeting",
      icon: "calendar-plus",
      panel: "meetings",
      ariaLabel: "Create meeting",
    },
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panel: "team-tasks",
      ariaLabel: "Create task",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  project: [
    {
      key: "meeting",
      label: "Meeting",
      icon: "calendar-plus",
      panel: "meetings",
      ariaLabel: "Create meeting",
    },
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panel: "project-tasks",
      ariaLabel: "Create task",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  meeting: [
    {
      key: "task",
      label: "Task",
      icon: "check-square",
      panel: "meeting-tasks",
      ariaLabel: "Create task",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  task: [
    {
      key: "subtask",
      label: "Sub-task",
      icon: "list-plus",
      panel: "task-subtasks",
      ariaLabel: "Create sub-task",
    },
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  fact: [
    {
      key: "log",
      label: "Log",
      icon: "file-plus",
      panel: "logs",
      ariaLabel: "Create log",
    },
  ],
  log: [
    {
      key: "fact",
      label: "Fact",
      icon: "bookmark-plus",
      panel: "facts",
      ariaLabel: "Create fact",
    },
  ],
};

const buildHeaderLabel = (entityType: MondoEntityType) => {
  const config = MONDO_ENTITIES[entityType];
  return config?.name ?? entityType;
};

const headerClasses = [
  "flex min-h-[5rem] items-start gap-3",
  "rounded-md border border-[var(--background-modifier-border)]",
  "bg-[var(--background-secondary)] px-3 py-2",
].join(" ");

const findPanelButton = (
  container: HTMLElement | null,
  panel: string,
  ariaLabel: string
): HTMLButtonElement | null => {
  if (!container) {
    return null;
  }

  const root = container.closest(".mondo-injected-hello-root") ?? container;
  const selector = `[data-entity-panel="${panel}"] button[aria-label="${ariaLabel}"]`;
  return root.querySelector<HTMLButtonElement>(selector);
};

const CollapsedPanelButton = ({
  panel,
}: {
  panel: CollapsedPanelSummary;
}) => {
  return (
    <button
      type="button"
      onClick={panel.onExpand}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-1 text-xs font-medium text-[var(--text-normal)] transition-colors hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0"
      aria-label={`Expand ${panel.label} panel`}
      title={panel.label}
      data-entity-panel={panel.panelType}
    >
      {panel.icon ? (
        <Icon
          name={panel.icon}
          className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-normal)]"
        />
      ) : null}
      <span className="min-w-0 truncate text-[var(--text-normal)]">
        {panel.label}
      </span>
      {panel.badgeLabel ? (
        <Badge className="flex-shrink-0">
          {panel.badgeLabel}
        </Badge>
      ) : null}
    </button>
  );
};

export const EntityHeaderMondo = ({
  containerRef,
  entityType,
}: EntityHeaderMondoProps) => {
  const { file } = useEntityFile();
  const app = useApp();

  const cachedFile = file as TCachedFile | undefined;

  const displayName = useMemo(
    () => (cachedFile ? getEntityDisplayName(cachedFile) : "Untitled"),
    [cachedFile]
  );

  const label = useMemo(() => buildHeaderLabel(entityType), [entityType]);

  const cover = useMemo(() => {
    if (!cachedFile) return null;
    return resolveCoverImage(app, cachedFile);
  }, [app, cachedFile]);

  const coverSrc = useMemo(() => {
    if (!cover) return null;
    return cover.kind === "vault" ? cover.resourcePath : cover.url;
  }, [cover]);

  const handleCoverClick = useCallback(() => {
    if (!cover) {
      return;
    }

    try {
      if (cover.kind === "vault") {
        const leaf = app.workspace.getLeaf(false) ?? app.workspace.getLeaf(true);
        void leaf?.openFile(cover.file);
      } else if (typeof window !== "undefined") {
        window.open(cover.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("EntityHeaderMondo: failed to open cover image", error);
    }
  }, [app, cover]);

  const placeholderIcon = useMemo(() => {
    const config = MONDO_ENTITIES[entityType];
    return config?.icon ?? "file-text";
  }, [entityType]);

  const actions = PANEL_ACTIONS[entityType] ?? [];
  const { collapsedPanels } = useEntityLinksLayout();

  const handleTrigger = useCallback(
    (panel: string, ariaLabel: string) => {
      const host = containerRef.current ?? null;
      const button = findPanelButton(host, panel, ariaLabel);

      if (!button) {
        new Notice("No matching panel is available to add that relation.");
        return;
      }

      button.click();
    },
    [containerRef]
  );

  const primary = actions[0];
  const hasCollapsedPanels = collapsedPanels.length > 0;

  const secondary = useMemo(
    () =>
      actions.slice(1).map((action) => ({
        label: action.label,
        icon: action.icon,
        onSelect: () => handleTrigger(action.panel, action.ariaLabel),
      })),
    [actions, handleTrigger]
  );

  const handlePrimaryClick = useCallback(() => {
    if (!primary) return;
    handleTrigger(primary.panel, primary.ariaLabel);
  }, [handleTrigger, primary]);

  return (
    <div className={headerClasses}>
      {coverSrc ? (
        <button
          type="button"
          onClick={handleCoverClick}
          className="group h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-transparent focus:outline-none focus-visible:border-[var(--interactive-accent)]"
          aria-label="Open cover image"
        >
          <img
            src={coverSrc}
            alt="Cover thumbnail"
            className="h-full w-full transition-transform group-hover:scale-[1.02]"
            style={{ objectFit: "cover" }}
          />
        </button>
      ) : (
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-[var(--background-modifier-border)]">
          <Icon
            name={placeholderIcon}
            className="h-8 w-8 text-[var(--text-muted)]"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--text-normal)]">
              {displayName}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Mondo Note • {label}
            </div>
          </div>
          {primary ? (
            <div className="flex-shrink-0">
              <SplitButton
                icon="plus"
                onClick={handlePrimaryClick}
                secondaryActions={secondary}
                menuAriaLabel="Select related entity to create"
              >
                Add Related
              </SplitButton>
            </div>
          ) : null}
        </div>

        {hasCollapsedPanels ? (
          <div
            className="flex flex-wrap gap-2"
            aria-label="Collapsed entity link panels"
          >
            {collapsedPanels.map((panel) => (
              <CollapsedPanelButton key={panel.id} panel={panel} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EntityHeaderMondo;
