import { useState } from "react";
import { useApp } from "@/hooks/use-app";
import { Typography } from "@/components/ui/Typography";
import Button from "@/components/ui/Button";
import Separator from "@/components/ui/Separator";
import QuickLogEntry from "./QuickLogEntry";
import QuickTaskEntry from "./QuickTaskEntry";
import { CRM_ENTITY_CONFIG_LIST } from "@/entities";
import EntityPicker from "./components/EntityPicker";
import RecentCRMNotes from "@/containers/RecentCRMNotes";
import QuickTasks from "@/containers/QuickTasks";

export const CRMDashboardView = () => {
  const app = useApp();
  const [_, setTick] = useState(0);
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

  const quickPickSections = CRM_ENTITY_CONFIG_LIST.map((config) => ({
    type: config.type,
    icon: config.icon,
    title: config.name,
    placeholder:
      config.dashboard.placeholder ?? `Search ${config.name.toLowerCase()}...`,
  }));

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">CRM Dashboard</Typography>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-4">
        <div className="w-full lg:flex-1">
          <QuickLogEntry />
        </div>
        <div className="w-full lg:flex-1">
          <QuickTaskEntry />
        </div>
        <div className="flex w-full flex-row flex-wrap justify-start gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
          <Button className="mod-cta" onClick={onOpenToday} icon="calendar">
            Open Today
          </Button>
          <Button className="mod-cta" onClick={onOpenJournal} icon="book-open">
            Open Journal
          </Button>
        </div>
      </div>
      <RecentCRMNotes />
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
