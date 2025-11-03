import { Typography } from "@/components/ui/Typography";
import { useSetting } from "@/hooks/use-setting";
import QuickButtons from "./components/QuickButtons";
import ImsEntities from "./components/ImsEntities";
import QuickTasksSection from "./components/QuickTasksSection";
import RelevantNotesSection from "./components/RelevantNotesSection";
import ImsButtons from "./components/ImsButtons";
import VaultStatsSection from "./components/VaultStatsSection";
import QuickDaily from "./QuickDaily";

export const DashboardView = () => {
  const quickTasksEnabled = useSetting<boolean>(
    "dashboard.enableQuickTasks",
    true
  );
  const relevantNotesEnabled = useSetting<boolean>(
    "dashboard.enableRelevantNotes",
    true
  );

  const quickDailyEnabled = true;
  const shouldShowProductivity =
    quickDailyEnabled || quickTasksEnabled || relevantNotesEnabled;

  return (
    <div className="p-4 space-y-6">
      <Typography variant="h1">Mondo Dashboard</Typography>
      <QuickButtons />
      {shouldShowProductivity && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {quickDailyEnabled && <QuickDaily collapsed={false} />}
          <QuickTasksSection enabled={quickTasksEnabled} />
          <RelevantNotesSection enabled={relevantNotesEnabled} />
        </div>
      )}
      <ImsEntities />
      <ImsButtons />
      <VaultStatsSection />
    </div>
  );
};
