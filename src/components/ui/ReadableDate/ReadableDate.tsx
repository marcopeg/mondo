import React, { useEffect, useMemo, useState, useId } from "react";

type ReadableDateValue = Date | string | number | null | undefined;

type ParsedDateValue = {
  date: Date | null;
  raw: string | null;
};

type ReadableDateProps = {
  value: ReadableDateValue;
  fallback?: React.ReactNode;
  className?: string;
  extraHint?: string | null;
};

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

const parseDateValue = (value: ReadableDateValue): ParsedDateValue => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { date: null, raw: null };
    }
    return { date: value, raw: value.toISOString() };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return { date: null, raw: null };
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { date: null, raw: null };
    }
    return { date, raw: date.toISOString() };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { date: null, raw: null };
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed, raw: trimmed };
    }

    const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00`;
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) {
      return { date: fallback, raw: trimmed };
    }

    return { date: null, raw: trimmed };
  }

  return { date: null, raw: null };
};

const getStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatRelative = (date: Date, now: number) => {
  const diffMs = date.getTime() - now;
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const absDiffSeconds = Math.round(absDiffMs / MS_IN_SECOND);

  if (absDiffSeconds <= 5) {
    return isFuture ? "in a few seconds" : "just now";
  }

  if (absDiffSeconds < 60) {
    const label = `${absDiffSeconds} sec`;
    return isFuture ? `in ${label}` : `${label} ago`;
  }

  if (absDiffMs < 5 * MS_IN_MINUTE) {
    return isFuture ? "in a few minutes" : "a few minutes ago";
  }

  if (absDiffMs < MS_IN_HOUR) {
    const minutes = Math.round(absDiffMs / MS_IN_MINUTE);
    const label = `${minutes} min`;
    return isFuture ? `in ${label}` : `${label} ago`;
  }

  const nowDate = new Date(now);
  const startOfNow = getStartOfDay(nowDate).getTime();
  const startOfTarget = getStartOfDay(date).getTime();
  const dayDelta = Math.round((startOfTarget - startOfNow) / MS_IN_DAY);

  if (dayDelta === 0) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (dayDelta === -1) {
    return "yesterday";
  }

  if (dayDelta === 1) {
    return "tomorrow";
  }

  if (Math.abs(dayDelta) < 7) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
    }).format(date);
  }

  if (nowDate.getFullYear() === date.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatFullDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

const attachMediaQueryListener = (
  mediaQuery: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void
) => {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }

  if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }

  return () => undefined;
};

export const ReadableDate: React.FC<ReadableDateProps> = ({
  value,
  fallback = "—",
  className,
  extraHint,
}) => {
  const { date, raw } = useMemo(() => parseDateValue(value), [value]);
  const [now, setNow] = useState(() => Date.now());
  const [supportsHover, setSupportsHover] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const tooltipId = useId();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSupportsHover(event.matches);
    };

    setSupportsHover(mediaQuery.matches);
    const detach = attachMediaQueryListener(mediaQuery, handleChange);

    return () => {
      detach();
    };
  }, []);

  useEffect(() => {
    if (supportsHover) {
      setIsToggled(false);
    }
  }, [supportsHover]);

  const displayLabel = date ? formatRelative(date, now) : raw ?? fallback;

  const fullHint = date ? formatFullDate(date) : raw ?? null;
  const tooltipParts: string[] = [];
  if (fullHint) {
    tooltipParts.push(fullHint);
  }
  if (extraHint) {
    tooltipParts.push(extraHint);
  }
  const tooltip = tooltipParts.join(" • ");

  const showTooltip = Boolean(tooltip);
  const isTooltipVisible = showTooltip
    ? supportsHover
      ? isHovering
      : isToggled
    : false;

  const containerClasses = ["relative inline-flex items-center", className]
    .filter(Boolean)
    .join(" ");

  const tooltipClasses = [
    "pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg transition-opacity duration-150",
    isTooltipVisible ? "opacity-100" : "opacity-0",
  ].join(" ");

  return (
    <span
      className={containerClasses}
      onMouseEnter={() => {
        if (!showTooltip || !supportsHover) return;
        setIsHovering(true);
      }}
      onMouseLeave={() => {
        if (!supportsHover) return;
        setIsHovering(false);
      }}
      onFocus={() => {
        if (!showTooltip) return;
        if (supportsHover) {
          setIsHovering(true);
        } else {
          setIsToggled(true);
        }
      }}
      onBlur={() => {
        setIsHovering(false);
        setIsToggled(false);
      }}
      onClick={() => {
        if (!showTooltip || supportsHover) return;
        setIsToggled((previous) => !previous);
      }}
      role={showTooltip ? "button" : undefined}
      aria-describedby={showTooltip ? tooltipId : undefined}
      tabIndex={showTooltip ? 0 : undefined}
    >
      <span>{displayLabel}</span>
      {showTooltip ? (
        <span id={tooltipId} className={tooltipClasses} role="tooltip">
          {tooltip}
        </span>
      ) : null}
    </span>
  );
};
