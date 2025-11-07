import RelevantNotes from "../../RelevantNotes";
import { useDashboardPanelCollapsed } from "../../hooks/useDashboardPanelCollapsed";

type RelevantNotesSectionProps = {
  enabled: boolean;
  isCompactLayout: boolean;
};

export const RelevantNotesSection = ({
  enabled,
  isCompactLayout,
}: RelevantNotesSectionProps) => {
  const [collapsed, setCollapsed] = useDashboardPanelCollapsed(
    "relevantNotes",
    isCompactLayout
  );

  if (!enabled) {
    return null;
  }

  return (
    <RelevantNotes
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
    />
  );
};
