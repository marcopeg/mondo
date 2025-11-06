import RelevantNotes from "../../RelevantNotes";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useDashboardPanelCollapsed } from "../../hooks/useDashboardPanelCollapsed";

type RelevantNotesSectionProps = {
  enabled: boolean;
};

export const RelevantNotesSection = ({
  enabled,
}: RelevantNotesSectionProps) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = useDashboardPanelCollapsed(
    "relevantNotes",
    !isDesktop
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
