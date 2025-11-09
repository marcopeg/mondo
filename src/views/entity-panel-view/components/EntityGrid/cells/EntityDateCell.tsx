import {
  getDateInfoForValue,
  getRowDateInfo,
  type MondoEntityDateInfo,
  type MondoEntityListColumn,
  type MondoEntityListRow,
} from "@/views/entity-panel-view/useEntityPanels";
import { ReadableDate } from "@/components/ui/ReadableDate";
import { MondoFileLink } from "../../MondoFileLink";

type EntityDateCellProps = {
  value: unknown;
  row: MondoEntityListRow;
  column: MondoEntityListColumn;
};

type DateDisplayInfo = {
  date: Date | null;
  raw: string | null;
  hasTime: boolean;
};

export const EntityDateCell = ({ value, row, column }: EntityDateCellProps) => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  let info: DateDisplayInfo;
  let source: MondoEntityDateInfo["source"] | undefined;

  if (column.type === "date") {
    const prop = column.prop ?? "date";

    if (prop === "date" || prop === "date_time" || prop === "datetime") {
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
  } else {
    const rowInfo = getRowDateInfo(row);
    info = {
      date: rowInfo.date,
      raw: rowInfo.raw,
      hasTime: rowInfo.hasTime,
    };
    source = rowInfo.source;
  }

  const valueForDisplay = info.date ?? info.raw ?? null;
  const fallback = info.raw ?? "—";
  const extraHint =
    source === "created" ? "Created from file metadata" : null;
  const dateContent = (
    <span className="inline-flex items-center gap-1">
      <ReadableDate
        value={valueForDisplay}
        fallback={fallback}
        extraHint={extraHint}
      />
      {source === "created" ? <span>• created</span> : null}
    </span>
  );
  const shouldLink =
    column.type === "date" &&
    (column.linkToNote === true ||
      (column.linkToNote === undefined &&
        (column.prop === "date_time" || column.prop === "datetime")));

  const mondoType =
    typeof row.frontmatter?.mondoType === "string"
      ? row.frontmatter.mondoType.trim().toLowerCase()
      : "";
  const isMeeting = mondoType === "meeting";

  const rawShow =
    typeof row.frontmatter?.show === "string"
      ? row.frontmatter.show.trim()
      : "";
  const fallbackLabel = row.file?.basename ?? row.file?.name ?? row.label;
  const showLabel = rawShow || fallbackLabel;

  const content = isMeeting && showLabel
    ? (
        <span className="flex flex-col gap-1">
          {dateContent}
          <span className="text-xs text-[var(--text-muted)]">{showLabel}</span>
        </span>
      )
    : dateContent;

  if (shouldLink) {
    return <MondoFileLink path={row.path} label={content} />;
  }

  return content;
};
