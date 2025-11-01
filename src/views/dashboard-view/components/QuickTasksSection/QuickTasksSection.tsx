import QuickTasks from "../../QuickTasks";

type QuickTasksSectionProps = {
  enabled: boolean;
};

export const QuickTasksSection = ({ enabled }: QuickTasksSectionProps) => {
  if (!enabled) {
    return null;
  }

  return <QuickTasks collapsed={false} />;
};
