import type { CSSProperties, FC } from "react";
import { useMemo } from "react";
import Button from "@/components/ui/Button";

export type HabitStreakProps = {
  checkedDays: string[];
  onClick: (dayId: string) => void;
  onToggleView: () => void;
  streakLength?: number;
  title?: string;
};

const accentColor = "var(--interactive-accent)";
const inactiveBackground = "var(--background-secondary)";
const activeText = "var(--text-on-accent)";
const inactiveText = "var(--text-muted)";

const buttonSize = "1.75rem";

const buttonStyle: CSSProperties = {
  width: buttonSize,
  height: buttonSize,
  borderRadius: 0,
  border: 0,
  padding: 0,
  fontSize: "0.75rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateId = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

export const HabitStreak: FC<HabitStreakProps> = ({
  checkedDays,
  onClick,
  onToggleView,
  streakLength = 21,
  title,
}) => {
  const checked = useMemo(() => new Set(checkedDays), [checkedDays]);

  const days = useMemo(() => {
    const length = Math.max(1, streakLength);
    const today = new Date();
    const todayId = formatDateId(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const result: Array<{
      id: string;
      label: string;
      isFuture: boolean;
      isActive: boolean;
    }> = [];

    for (let offset = length - 1; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);
      const id = formatDateId(
        current.getFullYear(),
        current.getMonth(),
        current.getDate()
      );
      result.push({
        id,
        label: String(current.getDate()),
        isFuture: id > todayId,
        isActive: checked.has(id),
      });
    }

    return result;
  }, [checked, streakLength]);

  return (
    <div className="flex flex-col gap-3 pt-2 pb-2">
      <div className="flex items-center justify-between">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--text-normal)" }}
        >
          {title ?? `Last ${days.length} days`}
        </div>
        <Button
          variant="link"
          className="mr-2"
          onClick={onToggleView}
        >
          View calendar
        </Button>
      </div>

      <div
        className="flex flex-wrap justify-end"
        style={{
          gap: 0,
        }}
      >
        {days.map((day) => {
          const backgroundColor = day.isActive
            ? accentColor
            : inactiveBackground;
          const color = day.isActive ? activeText : inactiveText;

          return (
            <button
              key={day.id}
              type="button"
              className="focus:outline-none"
              style={{
                ...buttonStyle,
                backgroundColor,
                color,
                cursor: day.isFuture ? "default" : "pointer",
                pointerEvents: day.isFuture ? "none" : "auto",
              }}
              onClick={() => onClick(day.id)}
              aria-pressed={day.isActive}
              aria-disabled={day.isFuture}
              disabled={day.isFuture}
              title={day.id}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HabitStreak;
