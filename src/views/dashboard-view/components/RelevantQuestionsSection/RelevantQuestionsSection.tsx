import RelevantQuestions from "../../RelevantQuestions";
import { useDashboardPanelCollapsed } from "../../hooks/useDashboardPanelCollapsed";

type RelevantQuestionsSectionProps = {
  enabled: boolean;
  isCompactLayout: boolean;
};

export const RelevantQuestionsSection = ({
  enabled,
  isCompactLayout,
}: RelevantQuestionsSectionProps) => {
  const [collapsed, setCollapsed] = useDashboardPanelCollapsed(
    "relevantQuestions",
    isCompactLayout
  );

  if (!enabled) {
    return null;
  }

  return (
    <RelevantQuestions
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
    />
  );
};
