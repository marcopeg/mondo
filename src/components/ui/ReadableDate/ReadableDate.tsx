import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover } from "@/components/ui/Popover";

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

export const ReadableDate: React.FC<ReadableDateProps> = ({
  value,
  fallback = "—",
  className,
  extraHint,
}) => {
  const { date, raw } = useMemo(() => parseDateValue(value), [value]);
  const [now, setNow] = useState(() => Date.now());
  // Track only explicit hover/focus state. We intentionally drop the prior
  // toggle + media-query complexity as the spec now requires simple
  // mouse-over show / mouse-out hide behaviour.
  const [isHovering, setIsHovering] = useState(false);
  const tooltipId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

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

  // Removed matchMedia + toggle logic: not needed for simplified spec.

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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
  const isTooltipVisible = showTooltip && isHovering;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsHovering(false);
      hideTimeoutRef.current = null;
    }, 100);
  }, [clearHideTimeout]);

  const containerClasses = ["relative inline-flex items-center", className]
    .filter(Boolean)
    .join(" ");

  const tooltipClasses = [
    // 4px horizontal padding, 2px vertical padding, 4px rounded corners.
    "whitespace-nowrap border text-[var(--text-normal)] shadow-lg transition-opacity duration-150 z-[9999]",
    "px-1 py-0.5 text-[11px] rounded",
    isTooltipVisible ? "opacity-100" : "opacity-0",
    "pointer-events-none",
  ].join(" ");

  const tooltipElementId =
    showTooltip && typeof document !== "undefined" ? tooltipId : undefined;

  const handleAnchorRef = useCallback((node: HTMLSpanElement | null) => {
    setAnchorEl(node);
  }, []);

  return (
    <>
      <span
        ref={handleAnchorRef}
        className={containerClasses}
        onPointerEnter={(event) => {
          if (!showTooltip || event.pointerType !== "mouse") {
            return;
          }
          clearHideTimeout();
          setIsHovering(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") {
            return;
          }
          scheduleHide();
        }}
        onMouseLeave={() => {
          scheduleHide();
        }}
        onFocus={() => {
          if (!showTooltip) return;
          clearHideTimeout();
          setIsHovering(true);
        }}
        onBlur={() => {
          clearHideTimeout();
          setIsHovering(false);
        }}
        role={showTooltip ? "button" : undefined}
        aria-describedby={tooltipElementId}
        tabIndex={showTooltip ? 0 : undefined}
      >
        <span>{displayLabel}</span>
      </span>
      <Popover
        id={tooltipElementId}
        role="tooltip"
        anchorEl={anchorEl}
        open={isTooltipVisible}
        className={tooltipClasses}
        style={{
          backgroundColor: "var(--background-primary)",
          border: "1px solid var(--background-modifier-border)",
          padding: "2px 4px",
          borderRadius: "4px",
          transform: "translateX(-50%)",
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        offset={{ vertical: 4 }}
      >
        {tooltip}
      </Popover>
    </>
  );
};
