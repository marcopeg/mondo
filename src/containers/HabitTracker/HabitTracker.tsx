import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  notePath?: string;
  value?: string;
};

const HabitTracker: FC<HabitTrackerProps> = ({
  title,
  blockKey,
  inlineKey,
  notePath,
}) => {
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(max-width: 640px)").matches;
  });
  const trackerKey = blockKey ?? inlineKey ?? "habits";
  const { checkedDays, viewMode, error, toggleDay, toggleView } =
    useHabitTracker({ trackerKey, filePath: notePath });
  const hasMounted = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const effectiveViewMode = isMobileView ? "streak" : viewMode;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileView(event.matches);
    };

    setIsMobileView(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleDayToggle = useCallback(
    (dayId: string) => {
      toggleDay(dayId);
    },
    [toggleDay]
  );

  const handleToggleView = useCallback(() => {
    if (!isMobileView) {
      toggleView();
    }
  }, [isMobileView, toggleView]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    scrollContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [effectiveViewMode]);

  return (
    <div ref={scrollContainerRef}>
      <Paper>
        <Stack direction="column" gap={3}>
          {effectiveViewMode === "calendar" ? (
            <HabitCalendar
              checkedDays={checkedDays}
              onClick={handleDayToggle}
              onToggleView={handleToggleView}
              title={title}
              showToggle={!isMobileView}
            />
          ) : (
            <HabitStreak
              checkedDays={checkedDays}
              onClick={handleDayToggle}
              onToggleView={handleToggleView}
              title={title}
              showToggle={!isMobileView}
            />
          )}

          {error && <InlineError message={error} />}
        </Stack>
      </Paper>
    </div>
  );
};

export { HabitTracker as default, HabitTracker };
