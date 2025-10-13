import React from "react";
import { Box } from "./Box";

type Direction = "row" | "row-reverse" | "column" | "column-reverse";
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify =
  | "start"
  | "center"
  | "end"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "stretch";

export type StackProps = React.PropsWithChildren<
  React.ComponentProps<typeof Box> & {
    direction?: Direction;
    align?: Align; // align-items
    justify?: Justify; // justify-content
    gap?: number; // Tailwind-like gap-{n}
  }
>;

const validateNonNegativeInteger = (n: any, name: string) => {
  if (n === undefined) return;
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `${name} must be a non-negative integer (received ${String(n)})`
    );
  }
};

const directionClass = (d: Direction | undefined) => {
  switch (d) {
    case "row-reverse":
      return "flex-row-reverse";
    case "column":
      return "flex-col";
    case "column-reverse":
      return "flex-col-reverse";
    case "row":
    default:
      // default flex direction is row, no class required
      return undefined;
  }
};

const alignClass = (a: Align | undefined) => {
  switch (a) {
    case "center":
      return "items-center";
    case "start":
      return "items-start";
    case "end":
      return "items-end";
    case "stretch":
      return "items-stretch";
    case "baseline":
      return "items-baseline";
    default:
      return undefined;
  }
};

const justifyClass = (j: Justify | undefined) => {
  switch (j) {
    case "center":
      return "justify-center";
    case "start":
      return "justify-start";
    case "end":
      return "justify-end";
    case "space-between":
      return "justify-between";
    case "space-around":
      return "justify-around";
    case "space-evenly":
      return "justify-evenly";
    case "stretch":
      return "justify-stretch";
    default:
      return undefined;
  }
};

export const Stack: React.FC<StackProps> = ({
  children,
  direction = "row",
  align,
  justify,
  gap,
  className,
  ...boxProps
}) => {
  // Validate gap if provided
  validateNonNegativeInteger(gap, "gap");

  const classes = [
    "flex",
    directionClass(direction),
    alignClass(align),
    justifyClass(justify),
    gap !== undefined ? `gap-${gap}` : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Forward all Box props (including spacing props p, m etc.) to Box
  return (
    <Box {...(boxProps as any)} className={classes}>
      {children}
    </Box>
  );
};

export default Stack;
