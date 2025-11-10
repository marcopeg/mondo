import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

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
  const isTooltipVisible = showTooltip && (isHovering || isToggled);

  const updateTooltipPosition = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const offset = 4;

    if (typeof window === "undefined") {
      setTooltipPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + offset,
      });
      return;
    }

    setTooltipPosition({
      left: rect.left + rect.width / 2 + window.scrollX,
      top: rect.bottom + offset + window.scrollY,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isTooltipVisible) {
      return;
    }

    updateTooltipPosition();
  }, [isTooltipVisible, updateTooltipPosition]);

  useEffect(() => {
    if (!isTooltipVisible || typeof window === "undefined") {
      return undefined;
    }

    const handleChange = () => {
      updateTooltipPosition();
    };

    window.addEventListener("resize", handleChange);
    window.addEventListener("scroll", handleChange, true);

    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("scroll", handleChange, true);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  useEffect(() => {
    if (!isTooltipVisible || supportsHover || typeof window === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && containerRef.current.contains(target)) {
        return;
      }

      setIsToggled(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isTooltipVisible, supportsHover]);

  const containerClasses = ["relative inline-flex items-center", className]
    .filter(Boolean)
    .join(" ");

  const tooltipClasses = [
    "pointer-events-none whitespace-nowrap rounded border px-2 py-1 text-xs text-[var(--text-normal)] shadow-lg transition-opacity duration-150 z-[9999]",
    isTooltipVisible ? "opacity-100" : "opacity-0",
  ].join(" ");

  const tooltipElementId =
    showTooltip && typeof document !== "undefined" ? tooltipId : undefined;

  const tooltipStyle = tooltipPosition
    ? {
        left: tooltipPosition.left,
        top: tooltipPosition.top,
        position: "absolute" as const,
        transform: "translateX(-50%)",
      }
    : undefined;

  const tooltipNode =
    showTooltip && typeof document !== "undefined"
      ? createPortal(
          <span
            id={tooltipElementId}
            className={tooltipClasses}
            role="tooltip"
            style={{
              ...tooltipStyle,
              backgroundColor: "var(--background-primary)",
              borderColor: "var(--background-modifier-border)",
            }}
          >
            {tooltip}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={containerRef}
        className={containerClasses}
        onPointerEnter={(event) => {
          if (!showTooltip || event.pointerType !== "mouse") {
            return;
          }
          setIsHovering(true);
        }}
        onPointerLeave={() => {
          setIsHovering(false);
          setIsToggled(false);
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
        aria-describedby={tooltipElementId}
        tabIndex={showTooltip ? 0 : undefined}
      >
        <span>{displayLabel}</span>
      </span>
      {tooltipNode}
    </>
  );
};
