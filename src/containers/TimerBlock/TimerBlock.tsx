import { type FC, useMemo } from "react";
import { useTimerBlock } from "./useTimerBlock";

type TimerBlockProps = Record<string, string>;

export const TimerBlock: FC<TimerBlockProps> = (props) => {
  const {
    canStart,
    currentLabel,
    displayTitle,
    durationSeconds,
    formattedRemaining,
    intervalSeconds,
    isResting,
    isRunning,
    start,
    stop,
  } = useTimerBlock(props);

  const buttonClassName = useMemo(() => {
    const classes = ["crm-timer-block__button"];

    classes.push(
      isRunning ? "crm-timer-block__button--stop" : "crm-timer-block__button--start"
    );

    if (isRunning && isResting) {
      classes.push("crm-timer-block__button--rest");
    }

    return classes.join(" ");
  }, [isResting, isRunning]);

  const statusClassName = useMemo(() => {
    const classes = ["crm-timer-block__status"];

    classes.push(
      isResting ? "crm-timer-block__status--rest" : "crm-timer-block__status--work"
    );

    return classes.join(" ");
  }, [isResting]);

  const handleToggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div
      className={`crm-timer-block ${isResting ? "crm-timer-block--resting" : ""}`.trim()}
    >
      <div className="crm-timer-block__heading">
        <div className="crm-timer-block__title">{displayTitle}</div>
        <div className={statusClassName} aria-live="polite">
          {currentLabel}
        </div>
      </div>
      <button
        type="button"
        className={buttonClassName}
        onClick={handleToggle}
        disabled={!canStart && !isRunning}
        aria-pressed={isRunning}
        aria-label={
          isRunning
            ? `Stop ${displayTitle} timer`
            : `Start ${displayTitle} timer`
        }
      >
        <span className="crm-timer-block__button-icon" aria-hidden>
          {isRunning ? "■" : "▶"}
        </span>
        <span className="crm-timer-block__countdown">{formattedRemaining}</span>
      </button>
      <div className="crm-timer-block__meta">
        <span className="crm-timer-block__meta-duration">{`${durationSeconds}s`}</span>
        <span className="crm-timer-block__meta-separator">/</span>
        <span className="crm-timer-block__meta-interval">{`${intervalSeconds}s`}</span>
      </div>
    </div>
  );
};
