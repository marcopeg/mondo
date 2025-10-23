import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { Typography } from "@/components/ui/Typography";
import Button from "@/components/ui/Button";
import Separator from "@/components/ui/Separator";
import { CRM_ENTITIES, CRM_UI_CONFIG } from "@/entities";
import EntityTilesGrid from "./components/EntityTilesGrid";
import RelevantNotes from "./RelevantNotes";
import QuickTasks from "./QuickTasks";
import { useSetting } from "@/hooks/use-setting";
import { resolveSelfPerson } from "@/utils/selfPerson";
import { useInboxTasks } from "@/hooks/use-inbox-tasks";

const useMediaQuery = (query: string) => {
  const getMatches = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(() => getMatches());

  useEffect(() => {
    setMatches(getMatches());

    if (typeof window === "undefined") {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", listener);
      return () => {
        mediaQueryList.removeEventListener("change", listener);
      };
    }

    mediaQueryList.addListener(listener);
    return () => {
      mediaQueryList.removeListener(listener);
    };
  }, [getMatches, query]);

  return matches;
};

export const DashboardView = () => {
  const app = useApp();
  const [_, setTick] = useState(0);
  const selfPersonPath = useSetting<string>("selfPersonPath", "");
  const selfPerson = useMemo(
    () => resolveSelfPerson(app, null, selfPersonPath),
    [app, selfPersonPath]
  );
  const onOpenToday = async () => {
    (app as any).commands.executeCommandById("crm:open-today");
  };

  const onOpenJournal = async () => {
    (app as any).commands.executeCommandById("crm:open-journal");
  };

  const onOpenEntityPanel = (entityType: string) => {
    const normalized = entityType?.trim();
    if (!normalized) return;
    (app as any).commands.executeCommandById(`crm:open-${normalized}`);
  };

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
      console.error("CRM Dashboard: failed to open self person note", error);
    }
  }, [app, selfPerson]);

  const entityTiles = useMemo(
    () =>
      CRM_UI_CONFIG.tiles.order
        .map((type) => CRM_ENTITIES[type])
        .filter(Boolean)
        .map((config) => ({
          type: config.type,
          icon: config.icon,
          title: config.name,
        })),
    []
  );

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

  const inboxTasksState = useInboxTasks();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const quickTasksCollapsed = false;
  const relevantNotesCollapsed = isDesktop ? false : true;

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">CRM Dashboard</Typography>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <QuickTasks collapsed={quickTasksCollapsed} state={inboxTasksState} />
        <RelevantNotes collapsed={relevantNotesCollapsed} />
      </div>
      <Separator spacing={4} />
      <Typography variant="h1">CRM Entities</Typography>
      <div className="mt-4">
        <EntityTilesGrid items={entityTiles} onOpen={onOpenEntityPanel} />
      </div>
    </div>
  );
};
