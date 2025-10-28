import {
  getDateInfoForValue,
  getRowDateInfo,
  type MondoEntityDateInfo,
  type MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { MondoFileLink } from "../../MondoFileLink";

type EntityDateCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: string;
};

type DateDisplayInfo = {
  date: Date | null;
  raw: string | null;
  hasTime: boolean;
};

const formatDateForDisplay = (
  info: DateDisplayInfo,
  source?: MondoEntityDateInfo["source"]
): string => {
  if (!info.date) {
    const fallback = info.raw?.trim();
    return fallback && fallback.length > 0 ? fallback : "—";
  }

  const options: Intl.DateTimeFormatOptions = info.hasTime
    ? {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    : {
        year: "numeric",
        month: "short",
        day: "numeric",
      };

  const formatted = info.date.toLocaleString(undefined, options);
  if (source === "created") {
    return `${formatted} • created`;
  }

  return formatted;
};

export const EntityDateCell = ({ value, row, column }: EntityDateCellProps) => {
  const normalizedColumn = column.toLowerCase();
  const rawValue = Array.isArray(value) ? value[0] : value;

  let info: DateDisplayInfo;
  let source: MondoEntityDateInfo["source"] | undefined;

  if (
    normalizedColumn === "date" ||
    normalizedColumn === "date_time" ||
    normalizedColumn === "datetime"
  ) {
    const rowInfo = getRowDateInfo(row);
    info = {
      date: rowInfo.date,
      raw: rowInfo.raw,
      hasTime: rowInfo.hasTime,
    };
    source = rowInfo.source;
  } else {
    const candidate = getDateInfoForValue(rawValue);
    info = {
      date: candidate.date,
      raw: candidate.raw,
      hasTime: candidate.hasTime,
    };
    source = undefined;

    if (!info.raw && typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      info = { ...info, raw: trimmed.length > 0 ? trimmed : null };
    }
  }

  const display = formatDateForDisplay(info, source);
  const shouldLink = normalizedColumn === "date_time";

  if (shouldLink) {
    return <MondoFileLink path={row.path} label={display} />;
  }

  return <span>{display}</span>;
};
