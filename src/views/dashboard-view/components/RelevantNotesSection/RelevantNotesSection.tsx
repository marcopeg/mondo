import RelevantNotes from "../../RelevantNotes";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type RelevantNotesSectionProps = {
  enabled: boolean;
};

export const RelevantNotesSection = ({
  enabled,
}: RelevantNotesSectionProps) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!enabled) {
    return null;
  }

  return <RelevantNotes collapsed={!isDesktop} />;
};
