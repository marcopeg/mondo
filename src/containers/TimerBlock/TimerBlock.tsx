import { type CSSProperties, type FC, useMemo } from "react";
import { useTimerBlock, type TimerBlockController } from "./useTimerBlock";

type TimerBlockProps = Record<string, unknown>;

const PROGRESS_RADIUS = 54;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

type TimerBlockContentProps = {
  controller: TimerBlockController;
  accentStyle?: CSSProperties;
};

const TimerBlockContent: FC<TimerBlockContentProps> = ({
  controller,
  accentStyle,
}) => {
  const {
    canStart,
    currentLoop,
    currentLabel,
    displayTitle,
    durationSeconds,
    formattedElapsed,
    formattedRemaining,
    hasFiniteLoops,
    intervalSeconds,
    isResting,
    isRunning,
    nextLabel,
    progress,
    totalLoops,
    start,
    stop,
  } = controller;

  const buttonClassName = useMemo(() => {
    const classes = ["mondo-timer-block__button"];

    classes.push(
      isResting
        ? "mondo-timer-block__button--rest"
        : "mondo-timer-block__button--go"
    );

    return classes.join(" ");
  }, [isResting]);

  const statusClassName = useMemo(() => {
    const classes = ["mondo-timer-block__status"];

    classes.push(
      isResting
        ? "mondo-timer-block__status--rest"
        : "mondo-timer-block__status--work"
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

  const buttonIcon = useMemo(() => {
    if (isRunning) {
      return (
        <svg
          className="mondo-timer-block__button-icon"
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
        className="mondo-timer-block__button-icon"
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
      className={`mondo-timer-block ${
        isResting ? "mondo-timer-block--resting" : ""
      }`.trim()}
      style={accentStyle}
    >
      <div className="mondo-timer-block__heading">
        <div className="mondo-timer-block__title">{displayTitle}</div>
        <div className="mondo-timer-block__status-container">
          <div className="mondo-timer-block__status-row">
            <div className={statusClassName}>{currentLabel}</div>
            {nextLabel && (
              <div className="mondo-timer-block__status-next">
                <span className="mondo-timer-block__status-next-label">
                  next up
                </span>
                <span className="mondo-timer-block__status-next-value">
                  {nextLabel}
                </span>
              </div>
            )}
          </div>
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
          className="mondo-timer-block__progress"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle
            className="mondo-timer-block__progress-track"
            cx="60"
            cy="60"
            r={PROGRESS_RADIUS}
          />
          <circle
            className="mondo-timer-block__progress-indicator"
            cx="60"
            cy="60"
            r={PROGRESS_RADIUS}
            style={progressStrokeStyle}
          />
        </svg>
        <span className="mondo-timer-block__button-content">
          {buttonIcon}
          <span className="mondo-timer-block__countdown">
            {formattedRemaining}
          </span>
          {hasFiniteLoops ? (
            <span className="mondo-timer-block__loop">{`(${currentLoop}/${totalLoops})`}</span>
          ) : null}
        </span>
      </button>
      <div className="mondo-timer-block__meta">
        {isRunning ? (
          <span className="mondo-timer-block__meta-value">
            {formattedElapsed}
          </span>
        ) : (
          <>
            <span className="mondo-timer-block__meta-duration">{`${durationSeconds}s`}</span>
            <span className="mondo-timer-block__meta-separator">/</span>
            <span className="mondo-timer-block__meta-interval">{`${intervalSeconds}s`}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const TimerBlock: FC<TimerBlockProps> = (props) => {
  const controller = useTimerBlock(props);

  const accentStyle = useMemo(() => {
    const rawColor = props.color;
    const customColor = typeof rawColor === "string" ? rawColor.trim() : "";

    if (!customColor) {
      return undefined;
    }

    return {
      ["--mondo-timer-accent" as const]: customColor,
    } as CSSProperties;
  }, [props.color]);

  return (
    <TimerBlockContent controller={controller} accentStyle={accentStyle} />
  );
};
