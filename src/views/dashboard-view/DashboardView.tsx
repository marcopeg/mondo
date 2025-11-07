import { useCallback, useState } from "react";
import { Typography } from "@/components/ui/Typography";
import { useSetting } from "@/hooks/use-setting";
import QuickButtons from "./components/QuickButtons";
import ImsEntities from "./components/ImsEntities";
import QuickTasksSection from "./components/QuickTasksSection";
import RelevantNotesSection from "./components/RelevantNotesSection";
import ImsButtons from "./components/ImsButtons";
import VaultStatsSection from "./components/VaultStatsSection";
import QuickDaily from "./QuickDaily";
import { useDashboardPanelCollapsed } from "./hooks/useDashboardPanelCollapsed";
import { useContainerBreakpoint } from "./hooks/useContainerBreakpoint";

const DASHBOARD_COMPACT_BREAKPOINT = 1024;

export const DashboardView = () => {
  const quickTasksEnabled = useSetting<boolean>(
    "dashboard.enableQuickTasks",
    true
  );
  const relevantNotesEnabled = useSetting<boolean>(
    "dashboard.enableRelevantNotes",
    true
  );

  const quickDailyEnabled = useSetting<boolean>(
    "dashboard.enableQuickDaily",
    false
  );
  const shouldShowProductivity =
    quickDailyEnabled || quickTasksEnabled || relevantNotesEnabled;

  const [quickDailyCollapsed, setQuickDailyCollapsed] =
    useDashboardPanelCollapsed("quickDaily", false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);
  const isCompactLayout = useContainerBreakpoint(
    container,
    DASHBOARD_COMPACT_BREAKPOINT
  );

  return (
    <div ref={handleContainerRef} className="p-4 space-y-6">
      <Typography variant="h1">Mondo Dashboard</Typography>
      <QuickButtons />
      {shouldShowProductivity && (
        <div
          className={`grid gap-4 items-start ${
            isCompactLayout ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {quickDailyEnabled && quickTasksEnabled ? (
            <div className="flex flex-col gap-4">
              <QuickDaily
                collapsed={quickDailyCollapsed}
                onCollapseChange={setQuickDailyCollapsed}
              />
              <QuickTasksSection enabled={quickTasksEnabled} />
            </div>
          ) : (
            <>
              {quickDailyEnabled && (
                <QuickDaily
                  collapsed={quickDailyCollapsed}
                  onCollapseChange={setQuickDailyCollapsed}
                />
              )}
              <QuickTasksSection enabled={quickTasksEnabled} />
            </>
          )}
          <RelevantNotesSection
            enabled={relevantNotesEnabled}
            isCompactLayout={isCompactLayout}
          />
        </div>
      )}
      <ImsEntities />
      <ImsButtons />
      <VaultStatsSection />
    </div>
  );
};
