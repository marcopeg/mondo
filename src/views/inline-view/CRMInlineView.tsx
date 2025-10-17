import { InlineError } from "@/components/InlineError";
import type { ComponentType } from "react";
import { JournalNav } from "@/containers/JournalNav";
import HabitTracker from "@/containers/HabitTracker";

type CRMInlineBlockProps = Record<string, string>;

const blocksMap: Record<string, ComponentType<CRMInlineBlockProps>> = {
  "journal-nav": JournalNav as ComponentType<CRMInlineBlockProps>,
  habits: HabitTracker as ComponentType<CRMInlineBlockProps>,
};

const parseInlineQuery = (query: string): CRMInlineBlockProps => {
  const params = new URLSearchParams(query);
  const result: CRMInlineBlockProps = {};

  params.forEach((value, key) => {
    if (key) {
      result[key] = value;
    }
  });

  return result;
};

const parseBlockSource = (
  raw: string
): { blockKey: string; props: CRMInlineBlockProps } => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { blockKey: "", props: {} };
  }

  const [firstLine, ...rest] = lines;
  const questionMarkIndex = firstLine.indexOf("?");
  const blockKey =
    questionMarkIndex !== -1
      ? firstLine.slice(0, questionMarkIndex).trim()
      : firstLine;
  const inlineQuery =
    questionMarkIndex !== -1 ? firstLine.slice(questionMarkIndex + 1) : "";

  const baseProps: CRMInlineBlockProps = inlineQuery
    ? parseInlineQuery(inlineQuery)
    : {};

  const props = rest.reduce<CRMInlineBlockProps>(
    (acc, line) => {
      const colonIndex = line.indexOf(":");
      const equalsIndex = line.indexOf("=");
      const separatorIndex = colonIndex !== -1 ? colonIndex : equalsIndex;
      if (separatorIndex === -1) {
        return acc;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key.length === 0) {
        return acc;
      }

      acc[key] = value;

      return acc;
    },
    { ...baseProps }
  );

  return { blockKey, props };
};

export const CRMInlineView = ({ source }: { source: string }) => {
  const { blockKey, props } = parseBlockSource(source);
  const BlockComponent = blockKey ? blocksMap[blockKey] : undefined;

  if (!BlockComponent) {
    return (
      <InlineError message={`block not found: ${blockKey || "(empty)"}`} />
    );
  }

  const { key: keyProp, ...restProps } = props;
  const componentProps: CRMInlineBlockProps =
    keyProp !== undefined
      ? { ...restProps, blockKey: keyProp, inlineKey: keyProp }
      : restProps;

  return <BlockComponent {...componentProps} />;
};
