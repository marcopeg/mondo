import React from "react";

/**
 * Typography
 *
 * Variants supported (maps to Obsidian visual styles where possible):
 * - h1: large section heading (maps to .setting-item-name / larger font)
 * - heading: normal heading
 * - subtitle: muted subtitle / description (uses --text-muted or .setting-item-description styles)
 * - body: normal body text
 * - muted: subdued text color
 * - code: inline code style
 *
 * Examples:
 * <Typography variant="h1">Title</Typography>
 * <Typography variant="subtitle">A short description</Typography>
 * <Typography variant="body">Regular paragraph text</Typography>
 *
 * The component tries to use Obsidian CSS variables and utility classes where appropriate.
 */

type Variant = "h1" | "heading" | "subtitle" | "body" | "muted" | "code";

type Props = {
  variant?: Variant;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  as?: React.ElementType;
};

export const Typography: React.FC<Props> = ({
  variant = "body",
  className,
  children,
  style,
  as: Component = "div",
}) => {
  // Map variants to Obsidian-friendly classes/variables
  const variantMap: Record<
    Variant,
    { className?: string; style?: React.CSSProperties }
  > = {
    h1: {
      className: "inline-title",
    },
    heading: {
      className: "setting-item-name",
      style: { fontSize: "1rem", fontWeight: 600 },
    },
    subtitle: {
      className: "setting-item-description",
      style: { color: "var(--text-muted)" },
    },
    body: { style: { color: "var(--text-normal)" } },
    muted: { style: { color: "var(--text-muted)" } },
    code: {
      className: "cm-inline",
      style: {
        fontFamily: "var(--font-mono)",
        background: "var(--background-primary)",
      },
    },
  };

  const variantInfo = variantMap[variant];

  return (
    <Component
      className={[variantInfo.className, className].filter(Boolean).join(" ")}
      style={{ ...variantInfo.style, ...style }}
    >
      {children}
    </Component>
  );
};

export default Typography;
