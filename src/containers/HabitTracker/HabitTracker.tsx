import type { FC } from "react";
import { useCallback, useEffect, useRef } from "react";
import Stack from "@/components/ui/Stack";
import Paper from "@/components/ui/Paper";
import { InlineError } from "@/components/InlineError";
import HabitCalendar from "./HabitCalendar";
import HabitStreak from "./HabitStreak";
import { useHabitTracker } from "./useHabitTracker";

type HabitTrackerProps = Record<string, string | undefined> & {
  title?: string;
  blockKey?: string;
  inlineKey?: string;
  value?: string;
};

const HabitTracker: FC<HabitTrackerProps> = ({
  title,
  blockKey,
  inlineKey,
}) => {
  const trackerKey = blockKey ?? inlineKey ?? "habits";
  const { checkedDays, viewMode, error, toggleDay, toggleView } =
    useHabitTracker({ trackerKey });
  const hasMounted = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleDayToggle = useCallback(
    (dayId: string) => {
      toggleDay(dayId);
    },
    [toggleDay]
  );

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    scrollContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [viewMode]);

  return (
    <div ref={scrollContainerRef}>
      <Paper>
        <Stack direction="column" gap={3}>
          {viewMode === "calendar" ? (
            <HabitCalendar
              checkedDays={checkedDays}
              onClick={handleDayToggle}
              onToggleView={toggleView}
              title={title}
            />
          ) : (
            <HabitStreak
              checkedDays={checkedDays}
              onClick={handleDayToggle}
              onToggleView={toggleView}
              title={title}
            />
          )}

          {error && <InlineError message={error} />}
        </Stack>
      </Paper>
    </div>
  );
};

export { HabitTracker as default, HabitTracker };
