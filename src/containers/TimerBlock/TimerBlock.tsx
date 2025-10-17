import { type CSSProperties, type FC, useMemo } from "react";
import { useTimerBlock } from "./useTimerBlock";

type TimerBlockProps = Record<string, string>;

const PROGRESS_RADIUS = 54;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

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
    progress,
    start,
    stop,
  } = useTimerBlock(props);

  const accentStyle = useMemo(() => {
    const customColor = props.color?.trim();

    if (!customColor) {
      return undefined;
    }

    return {
      ["--crm-timer-accent" as const]: customColor,
    } as CSSProperties;
  }, [props.color]);

  const buttonClassName = useMemo(() => {
    const classes = ["crm-timer-block__button"];

    classes.push(
      isResting ? "crm-timer-block__button--rest" : "crm-timer-block__button--go"
    );

    return classes.join(" ");
  }, [isResting]);

  const statusClassName = useMemo(() => {
    const classes = ["crm-timer-block__status"];

    classes.push(
      isResting ? "crm-timer-block__status--rest" : "crm-timer-block__status--work"
    );

    return classes.join(" ");
  }, [isResting]);

  const progressStrokeStyle = useMemo<CSSProperties>(() => {
    const safeProgress = Math.min(Math.max(progress, 0), 1);
    const dashOffset = (1 - safeProgress) * PROGRESS_CIRCUMFERENCE;

    return {
      strokeDasharray: `${PROGRESS_CIRCUMFERENCE}`,
      strokeDashoffset: `${dashOffset}`,
    };
  }, [progress]);

  const handleToggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  const phaseLabel = isResting ? "rest" : "go";

  const buttonIcon = useMemo(() => {
    if (isRunning) {
      return (
        <svg
          className="crm-timer-block__button-icon"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect x="6" y="5" width="5" height="14" rx="1.5" />
          <rect x="13" y="5" width="5" height="14" rx="1.5" />
        </svg>
      );
    }

    return (
      <svg
        className="crm-timer-block__button-icon"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M8 5.5v13l10-6.5Z" />
      </svg>
    );
  }, [isRunning]);

  return (
    <div
      className={`crm-timer-block ${isResting ? "crm-timer-block--resting" : ""}`.trim()}
      style={accentStyle}
    >
      <div className="crm-timer-block__heading">
        <div className="crm-timer-block__title">{displayTitle}</div>
        <div className={statusClassName}>
          {phaseLabel}
        </div>
        <div className="crm-timer-block__phase" aria-live="polite">
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
        <svg
          className="crm-timer-block__progress"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle
            className="crm-timer-block__progress-track"
            cx="60"
            cy="60"
            r={PROGRESS_RADIUS}
          />
          <circle
            className="crm-timer-block__progress-indicator"
            cx="60"
            cy="60"
            r={PROGRESS_RADIUS}
            style={progressStrokeStyle}
          />
        </svg>
        <span className="crm-timer-block__button-content">
          {buttonIcon}
          <span className="crm-timer-block__countdown">{formattedRemaining}</span>
        </span>
      </button>
      <div className="crm-timer-block__meta">
        <span className="crm-timer-block__meta-duration">{`${durationSeconds}s`}</span>
        <span className="crm-timer-block__meta-separator">/</span>
        <span className="crm-timer-block__meta-interval">{`${intervalSeconds}s`}</span>
      </div>
    </div>
  );
};
