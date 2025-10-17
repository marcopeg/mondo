import type { CRMEntityListRow } from "@/views/entity-panel-view/useCRMEntityPanel";
import { CRMFileLink } from "../../CRMFileLink";

type EntityDateCellProps = {
  value: unknown;
  row: CRMEntityListRow;
  column: string;
};

const toDate = (dateValue: string, timeValue?: string): Date | null => {
  if (!dateValue) return null;
  const datePart = dateValue.trim();
  if (!datePart) return null;
  const isoCandidate = timeValue
    ? `${datePart}T${timeValue.trim()}`
    : `${datePart}T00:00`;
  const date = new Date(isoCandidate);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(datePart);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return date;
};

const formatDateTime = (date: Date | null, dateValue?: string, timeValue?: string) => {
  if (!date) {
    const parts = [dateValue, timeValue].filter(Boolean).join(" ");
    return parts || "—";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  let formatted = date.toLocaleDateString(undefined, options);

  const sanitizedTime = timeValue?.trim();
  if (sanitizedTime && sanitizedTime.length > 0) {
    const [hours = "00", minutes = "00"] = sanitizedTime.split(":");
    const displayTime = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    formatted = `${formatted} • ${displayTime}`;
  }

  return formatted;
};

const getTimeFromDate = (date: Date): string | undefined => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const EntityDateCell = ({ value, row, column }: EntityDateCellProps) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const directDate = rawValue instanceof Date ? rawValue : null;
  const dateString = typeof rawValue === "string" ? rawValue : undefined;
  const timeRaw = row.frontmatter?.time;
  const explicitTime =
    typeof timeRaw === "string" && timeRaw.trim().length > 0
      ? timeRaw.trim()
      : undefined;

  const date = directDate ?? (dateString ? toDate(dateString, explicitTime) : null);
  const fallbackDateString =
    dateString ?? (directDate ? directDate.toISOString().split("T")[0] : undefined);
  const effectiveTime = explicitTime ?? (directDate ? getTimeFromDate(directDate) : undefined);
  const display = formatDateTime(date, fallbackDateString, effectiveTime);

  const shouldLink = column.toLowerCase() === "date_time";
  if (shouldLink) {
    return <CRMFileLink path={row.path} label={display} />;
  }

  return <span>{display}</span>;
};
