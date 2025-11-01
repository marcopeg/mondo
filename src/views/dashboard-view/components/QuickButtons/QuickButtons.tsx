import { useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import { useApp } from "@/hooks/use-app";
import { useSetting } from "@/hooks/use-setting";
import { resolveSelfPerson } from "@/utils/selfPerson";

export const QuickButtons = () => {
  const app = useApp();
  const selfPersonPath = useSetting<string>("selfPersonPath", "");
  const selfPerson = useMemo(
    () => resolveSelfPerson(app, null, selfPersonPath),
    [app, selfPersonPath]
  );

  const executeCommand = useCallback(
    (commandId: string) => {
      (app as any).commands.executeCommandById(commandId);
    },
    [app]
  );

  const onOpenToday = useCallback(() => {
    executeCommand("mondo:open-today");
  }, [executeCommand]);

  const onOpenJournal = useCallback(() => {
    executeCommand("mondo:open-journal");
  }, [executeCommand]);

  const onOpenMe = useCallback(async () => {
    if (!selfPerson) {
      return;
    }

    try {
      const leaf = app.workspace.getLeaf(false) || app.workspace.getLeaf(true);
      if (leaf) {
        await (leaf as any).openFile(selfPerson.file);
      }
    } catch (error) {
      console.error("Mondo Dashboard: failed to open self person note", error);
    }
  }, [app, selfPerson]);

  const quickActions = useMemo(
    () =>
      [
        selfPerson
          ? {
              key: "me",
              label: "Open Me",
              icon: "user",
              onClick: onOpenMe,
            }
          : null,
        {
          key: "today",
          label: "Open Today",
          icon: "calendar",
          onClick: onOpenToday,
        },
        {
          key: "journal",
          label: "Open Journal",
          icon: "book-open",
          onClick: onOpenJournal,
        },
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        icon: string;
        onClick: () => void;
      }>,
    [onOpenJournal, onOpenMe, onOpenToday, selfPerson]
  );

  if (quickActions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-row flex-nowrap items-stretch gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.key}
            aria-label={action.label}
            className="mod-cta flex flex-1 items-center justify-center sm:justify-start"
            icon={action.icon}
            onClick={action.onClick}
          >
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
