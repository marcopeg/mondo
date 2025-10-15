import React from "react";
import { Icon } from "./Icon";
import { useLink } from "@/components/ui/Link";

type IconPosition = "start" | "end";

type ButtonVariant = "button" | "link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string; // lucide/obsidian icon name
  iconPosition?: IconPosition;
  children?: React.ReactNode;
  to?: string; // optional path to use Link internally
  variant?: ButtonVariant;
  fullWidth?: boolean;
  iconClassName?: string;
};

export const Button: React.FC<ButtonProps> = ({
  icon,
  iconPosition = "start",
  children,
  className,
  to,
  variant = "button",
  fullWidth = false,
  iconClassName,
  ...rest
}) => {
  const isStart = iconPosition === "start";
  const iconElement = icon ? <Icon name={icon} className={iconClassName} /> : null;
  const content = (
    <>
      {isStart && iconElement}
      {children}
      {!isStart && iconElement}
    </>
  );

  const isLinkVariant = variant === "link";
  const baseClasses = isLinkVariant
    ? [
        "crm-button-link",
        fullWidth ? "flex" : "inline-flex",
        "items-center gap-1 bg-transparent border-0 p-0 m-0 text-left text-[var(--link-color,var(--interactive-accent))] hover:text-[var(--link-color-hover,var(--link-color,var(--interactive-accent)))]",
      ]
    : ["crm-button"];

  if (fullWidth) {
    baseClasses.push("w-full");
  }

  const classes = [...baseClasses, className]
    .filter(Boolean)
    .join(" ");

  const linkStyle: React.CSSProperties | undefined = isLinkVariant
    ? {
        cursor: rest.disabled ? undefined : "var(--cursor-link, pointer)",
        textDecorationLine: "var(--link-decoration, underline)",
        textDecorationThickness: "var(--link-decoration-thickness, 1px)",
        background: "transparent",
        boxShadow: "none",
      }
    : undefined;

  // If `to` is provided, render a Link instead of a native button so it behaves as navigation
  if (to) {
    // If `to` is provided we'll render a native button that behaves like a link via useLink
    const { onClick, disabled, "aria-label": ariaLabel, title } = rest as any;
    const ref = React.useRef<HTMLButtonElement>(null);
    useLink(ref as any, to, { onClick: (e: MouseEvent) => onClick && onClick(e as any), disabled });

    const [isHover, setIsHover] = React.useState(false);

    const linkStyles: React.CSSProperties = isLinkVariant
      ? {
          ...linkStyle,
          color: isHover
            ? "var(--link-color-hover, var(--link-color,var(--interactive-accent)))"
            : "var(--link-color, var(--interactive-accent))",
          border: "none",
          outline: "none",
        }
      : { cursor: disabled ? undefined : "pointer" };

    const roleAttr = isLinkVariant ? "link" : "button";

    return (
      <button
        ref={ref}
        className={classes}
        title={title}
        aria-label={ariaLabel}
        disabled={disabled}
        role={roleAttr}
        style={linkStyles}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      className={classes}
      style={isLinkVariant ? linkStyle : undefined}
      {...(rest as any)}
    >
      {content}
    </button>
  );
};

export default Button;
