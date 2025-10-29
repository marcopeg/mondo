import {
  getDateInfoForValue,
  getRowDateInfo,
  type MondoEntityDateInfo,
  type MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { ReadableDate } from "@/components/ui/ReadableDate";
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

  const valueForDisplay = info.date ?? info.raw ?? null;
  const fallback = info.raw ?? "—";
  const extraHint =
    source === "created" ? "Created from file metadata" : null;
  const content = (
    <span className="inline-flex items-center gap-1">
      <ReadableDate
        value={valueForDisplay}
        fallback={fallback}
        extraHint={extraHint}
      />
      {source === "created" ? <span>• created</span> : null}
    </span>
  );
  const shouldLink = normalizedColumn === "date_time";

  if (shouldLink) {
    return <MondoFileLink path={row.path} label={content} />;
  }

  return content;
};
