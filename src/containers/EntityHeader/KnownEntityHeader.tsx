import { useCallback, useMemo } from "react";
import type { RefObject } from "react";
import { Notice } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import type { MondoEntityType } from "@/entities";

const PANEL_ACTIONS: Partial<
  Record<
    MondoEntityType,
    {
      key: string;
      label: string;
      icon?: string;
      panel: string;
      ariaLabel: string;
    }[]
  >
> = {
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

type KnownEntityHeaderProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  entityType: MondoEntityType;
};

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

export const KnownEntityHeader = ({
  containerRef,
  entityType,
}: KnownEntityHeaderProps) => {
  const actions = PANEL_ACTIONS[entityType] ?? [];

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
  const secondary = useMemo(
    () =>
      actions.slice(1).map((action) => ({
        label: action.label,
        icon: action.icon,
        onSelect: () => handleTrigger(action.panel, action.ariaLabel),
      })),
    [actions, handleTrigger]
  );

  // Keep hook calls stable across renders: define the primary click handler
  // unconditionally even if `primary` is undefined on some renders. The
  // handler itself guards against missing `primary` at call time.
  const handlePrimaryClick = useCallback(() => {
    if (!primary) return;
    handleTrigger(primary.panel, primary.ariaLabel);
  }, [handleTrigger, primary]);

  if (!primary) {
    return null;
  }

  return (
    <SplitButton
      icon="plus"
      onClick={handlePrimaryClick}
      secondaryActions={secondary}
      menuAriaLabel="Select related entity to create"
    >
      Add Related
    </SplitButton>
  );
};

export default KnownEntityHeader;
