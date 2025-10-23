import React from "react";
import { Box } from "./Box";

type PaperProps = React.ComponentProps<typeof Box> & {
  // default padding unit if caller doesn't pass explicit padding props
  p?: number;
};

export const Paper: React.FC<PaperProps> = ({
  children,
  className,
  style,
  p = 2,
  ...rest
}) => {
  // Build default padding class only when caller didn't pass explicit p/px/py/pt/pb
  const hasExplicitPadding =
    (rest as any).p !== undefined ||
    (rest as any).px !== undefined ||
    (rest as any).py !== undefined ||
    (rest as any).pt !== undefined ||
    (rest as any).pb !== undefined;
  const paddingClass = hasExplicitPadding ? undefined : `p-${p}`;

  const visualStyle: React.CSSProperties = {
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "var(--radius-m, var(--radius-ml))",
    backgroundColor: "var(--background-secondary)",
    boxShadow: "var(--shadow-s, var(--input-shadow, none))",
    clipPath: "none",
  };

  return (
    <Box
      {...(rest as any)}
      className={[paddingClass, "crm-paper", "mod-card", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...visualStyle, ...style }}
    >
      {children}
    </Box>
  );
};

export default Paper;
