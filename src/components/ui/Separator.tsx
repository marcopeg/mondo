import React from "react";

type SeparatorProps = {
  direction?: "horizontal" | "vertical";
  thickness?: number; // px
  length?: string; // CSS length for the long axis (e.g., '100%' or '1rem')
  className?: string;
  style?: React.CSSProperties;
  // spacing applies as my (horizontal) or mx (vertical)
  spacing?: number;
  // spacingBefore/After map to mt/mb or ml/mr based on direction
  spacingBefore?: number;
  spacingAfter?: number;
};

/**
 * Separator displays a thin line. Defaults to horizontal full-width divider.
 * Uses Obsidian CSS variables for color so it matches the theme.
 */
export const Separator: React.FC<SeparatorProps> = ({
  direction = "horizontal",
  thickness = 1,
  length = "100%",
  className,
  style,
  spacing,
  spacingBefore,
  spacingAfter,
}) => {
  const isHorizontal = direction === "horizontal";

  const baseStyle: React.CSSProperties = isHorizontal
    ? {
        width: length,
        height: thickness,
        background: "var(--setting-item-border-color)",
      }
    : {
        width: thickness,
        height: length,
        background: "var(--setting-item-border-color)",
      };

  const isValidSpacing = (n: any) => Number.isInteger(n) && n >= 0;

  const spacingClasses: string[] = [];

  if (spacing !== undefined) {
    if (!isValidSpacing(spacing))
      throw new Error(`spacing must be a non-negative integer`);
    spacingClasses.push(isHorizontal ? `my-${spacing}` : `mx-${spacing}`);
  }

  if (spacingBefore !== undefined) {
    if (!isValidSpacing(spacingBefore))
      throw new Error(`spacingBefore must be a non-negative integer`);
    spacingClasses.push(
      isHorizontal ? `mt-${spacingBefore}` : `ml-${spacingBefore}`
    );
  }

  if (spacingAfter !== undefined) {
    if (!isValidSpacing(spacingAfter))
      throw new Error(`spacingAfter must be a non-negative integer`);
    spacingClasses.push(
      isHorizontal ? `mb-${spacingAfter}` : `mr-${spacingAfter}`
    );
  }

  const combinedClassName = [spacingClasses.join(" "), className]
    .filter(Boolean)
    .join(" ");

  // Inline margin fallback so spacing works even without Tailwind.
  // Map Tailwind spacing units (1 -> 0.25rem) to rem values.
  const unitRem = 0.25;
  const toRem = (n: number) => `${n * unitRem}rem`;

  const marginStyle: React.CSSProperties = {};
  if (spacing !== undefined) {
    const v = toRem(spacing);
    if (isHorizontal) {
      marginStyle.marginTop = v;
      marginStyle.marginBottom = v;
    } else {
      marginStyle.marginLeft = v;
      marginStyle.marginRight = v;
    }
  }
  if (spacingBefore !== undefined) {
    const v = toRem(spacingBefore);
    if (isHorizontal) marginStyle.marginTop = v;
    else marginStyle.marginLeft = v;
  }
  if (spacingAfter !== undefined) {
    const v = toRem(spacingAfter);
    if (isHorizontal) marginStyle.marginBottom = v;
    else marginStyle.marginRight = v;
  }

  return (
    <div
      className={combinedClassName}
      style={{ ...baseStyle, ...marginStyle, ...style }}
      aria-hidden
    />
  );
};

export default Separator;
