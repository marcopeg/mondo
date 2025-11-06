import QuickTasks from "../../QuickTasks";
import { useDashboardPanelCollapsed } from "../../hooks/useDashboardPanelCollapsed";

type QuickTasksSectionProps = {
  enabled: boolean;
};

export const QuickTasksSection = ({ enabled }: QuickTasksSectionProps) => {
  const [collapsed, setCollapsed] = useDashboardPanelCollapsed(
    "quickTasks",
    false
  );

  if (!enabled) {
    return null;
  }

  return (
    <QuickTasks
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
    />
  );
};
