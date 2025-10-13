import React from "react";

/**
 * Generic Box component used for small bordered containers in the UI.
 * Implements the inline style requested by the user:
 *   border: 1px solid var(--setting-item-border-color)
 *   border-radius: var(--radius-ml)
 *   clip-path: none
 *   padding-block: 14px
 *
 * It accepts `className` and `style` props which are merged with the base style.
 */
interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  style?: React.CSSProperties;

  // Padding props (Tailwind-style integers)
  p?: number;
  px?: number;
  py?: number;
  pt?: number;
  pb?: number;

  // Margin props (Tailwind-style integers)
  m?: number;
  mx?: number;
  my?: number;
  mt?: number;
  mb?: number;
}

const isValidSpacing = (n: any) => Number.isInteger(n) && n >= 0;

const buildClass = (prefix: string, value?: number) => {
  if (value === undefined) return undefined;
  if (!isValidSpacing(value)) {
    throw new Error(
      `${prefix} prop must be a non-negative integer (received ${String(
        value
      )})`
    );
  }
  return `${prefix}-${value}`;
};

export const Box: React.FC<React.PropsWithChildren<BoxProps>> = ({
  children,
  className,
  style,
  p,
  px,
  py,
  pt,
  pb,
  m,
  mx,
  my,
  mt,
  mb,
  ...rest
}) => {
  // Build Tailwind-like spacing classes from provided numeric props.
  const spacingClasses = [
    buildClass("p", p),
    buildClass("px", px),
    buildClass("py", py),
    buildClass("pt", pt),
    buildClass("pb", pb),
    buildClass("m", m),
    buildClass("mx", mx),
    buildClass("my", my),
    buildClass("mt", mt),
    buildClass("mb", mb),
  ].filter(Boolean) as string[];

  const spacingClassName = spacingClasses.join(" ");

  const baseStyle: React.CSSProperties = {
    // Box is purely spacing; visual styles (border/background) are provided by Paper
    // apply default padding-block only when no spacing props are provided and caller didn't set padding via style
    ...(spacingClasses.length === 0 &&
    !(style && (style.padding || style.paddingBlock))
      ? { paddingBlock: "0px" }
      : {}),
  };

  const combinedClassName = [spacingClassName, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={combinedClassName}
      style={{ ...baseStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
};
