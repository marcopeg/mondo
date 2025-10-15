import { useState } from "react";
import { useApp } from "@/hooks/use-app";
import Stack from "@/components/ui/Stack";
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
  const onNewLog = async () => {
    (app as any).commands.executeCommandById("crm:add-log");
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
      <Stack
        align="center"
        justify="space-between"
        gap={4}
        className="items-center flex-wrap gap-y-2"
      >
        <div className="flex items-center gap-4">
          <Button className="mod-cta" onClick={onNewLog} icon="notebook-pen">
            New Log
          </Button>
          <Button className="mod-cta" onClick={onOpenJournal} icon="book-open">
            Open Journal
          </Button>
        </div>
      </Stack>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full lg:w-1/2">
          <QuickLogEntry />
        </div>
        <div className="w-full lg:w-1/2">
          <QuickTaskEntry />
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
