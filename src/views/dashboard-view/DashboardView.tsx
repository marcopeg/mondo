import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/hooks/use-app";
import { Typography } from "@/components/ui/Typography";
import Button from "@/components/ui/Button";
import Separator from "@/components/ui/Separator";
import QuickLog from "./QuickLogEntry";
import QuickTask from "./QuickTaskEntry";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import EntityPicker from "./components/EntityPicker";
import RecentNotes from "./RecentCRMNotes";
import QuickTasks from "./QuickTasks";
import { useSetting } from "@/hooks/use-setting";
import { resolveSelfPerson } from "@/utils/selfPerson";

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

  const quickPickSections = CRM_ENTITY_CONFIG_LIST.map((config) => ({
    type: config.type,
    icon: config.icon,
    title: config.name,
    placeholder: "",
  }));

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
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
          <div className="w-full">
            <QuickLog />
          </div>
          <div className="w-full">
            <QuickTask />
          </div>
        </div>
      </div>
      <RecentNotes />
      <QuickTasks collapsed />
      <Separator spacing={4} />
      <div className="mt-4 grid grid-cols-1 gap-y-8 gap-x-16 md:grid-cols-2 xl:grid-cols-3">
        {quickPickSections.map((section) => (
          <EntityPicker
            key={section.type}
            icon={section.icon}
            title={section.title}
            type={section.type}
            placeholder={section.placeholder}
            onOpenList={() => onOpenEntityPanel(section.type)}
          />
        ))}
      </div>
    </div>
  );
};
