import type { CSSProperties, FC } from "react";
import { useCallback, useMemo, useState } from "react";
import Button from "@/components/ui/Button";

export type HabitCalendarProps = {
  checkedDays: string[];
  onClick: (dayId: string) => void;
  onToggleView: () => void;
  title?: string;
};

const MONTH_LABELS = [
  { short: "J", full: "January" },
  { short: "F", full: "February" },
  { short: "M", full: "March" },
  { short: "A", full: "April" },
  { short: "M", full: "May" },
  { short: "J", full: "June" },
  { short: "J", full: "July" },
  { short: "A", full: "August" },
  { short: "S", full: "September" },
  { short: "O", full: "October" },
  { short: "N", full: "November" },
  { short: "D", full: "December" },
];

const accentColor = "var(--interactive-accent)";
const inactiveBackground = "var(--background-secondary)";
const inactiveText = "var(--text-muted)";
const activeText = "var(--text-on-accent)";

const cellBaseStyle: CSSProperties = {
  aspectRatio: "1 / 1",
  margin: 0,
  border: 0,
  borderRadius: 0,
  padding: 0,
  width: "100%",
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateId = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

export const HabitCalendar: FC<HabitCalendarProps> = ({
  checkedDays,
  onClick,
  onToggleView,
  title,
}) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const checked = useMemo(() => new Set(checkedDays), [checkedDays]);

  const handlePrevYear = useCallback(() => {
    setYear((current) => current - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setYear((current) => current + 1);
  }, []);

  const handleResetYear = useCallback(() => {
    setYear(new Date().getFullYear());
  }, []);

  const months = useMemo(() => {
    const now = new Date();
    const todayId = formatDateId(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return MONTH_LABELS.map(({ short, full }, monthIndex) => {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const dayNumber = dayIndex + 1;
        const dateId = formatDateId(year, monthIndex, dayNumber);
        const isFuture = dateId > todayId;
        return {
          id: dateId,
          label: String(dayNumber),
          isFuture,
          isActive: checked.has(dateId),
        };
      });
      return {
        id: `${full}-${year}`,
        shortLabel: short,
        fullLabel: full,
        days,
      };
    });
  }, [checked, year]);

  return (
    <div className="flex flex-col gap-4 pt-2 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--background-modifier-border)" }}
            onClick={handlePrevYear}
          >
            ◀
          </button>
          <button
            type="button"
            className="text-base font-semibold"
            style={{ color: "var(--text-normal)" }}
            onClick={handleResetYear}
          >
            {year}
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--background-modifier-border)" }}
            onClick={handleNextYear}
          >
            ▶
          </button>
        </div>

        <div className="flex-1 flex justify-center">
          {title && (
            <div
              className="text-sm font-semibold text-center"
              style={{ color: "var(--text-normal)" }}
            >
              {title}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <Button
            variant="link"
            className="mr-2"
            onClick={onToggleView}
          >
            View streak
          </Button>
        </div>
      </div>

      <div
        className="grid w-full"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {months.map((month) => (
          <div key={month.id} className="flex flex-col items-center">
            <div
              className="text-xs font-semibold uppercase tracking-wide flex items-center justify-center w-full h-6"
              title={month.fullLabel}
            >
              {month.shortLabel}
            </div>

            <div
              className="grid w-full"
              style={{ gridAutoRows: "minmax(0, 1fr)", justifyItems: "center" }}
            >
              {month.days.map((day) => {
                const backgroundColor = day.isActive
                  ? accentColor
                  : inactiveBackground;
                const color = day.isActive ? activeText : inactiveText;

                return (
                  <button
                    key={day.id}
                    type="button"
                    className="flex items-center justify-center text-[10px] focus:outline-none"
                    style={{
                      ...cellBaseStyle,
                      backgroundColor,
                      color,
                      pointerEvents: day.isFuture ? "none" : "auto",
                      cursor: day.isFuture ? "default" : "pointer",
                    }}
                    onClick={() => onClick(day.id)}
                    aria-pressed={day.isActive}
                    aria-disabled={day.isFuture}
                    disabled={day.isFuture}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HabitCalendar;
