import React from "react";
import { Icon } from "./Icon";
import { useLink } from "@/components/ui/Link";

type IconPosition = "start" | "end";

type ButtonVariant = "button" | "link";
type ButtonTone = "default" | "info" | "success" | "danger" | "warning";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string; // lucide/obsidian icon name
  iconPosition?: IconPosition;
  children?: React.ReactNode;
  to?: string; // optional path to use Link internally
  variant?: ButtonVariant;
  fullWidth?: boolean;
  iconClassName?: string;
  tone?: ButtonTone; // visual tone for text/icon color (link variant primarily)
  pressed?: boolean; // render the button as an active/pressed toggle state
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
  tone = "default",
  pressed,
  ...rest
}) => {
  const isStart = iconPosition === "start";
  const iconElement = icon ? (
    <Icon name={icon} className={iconClassName} />
  ) : null;
  const content = (
    <>
      {isStart && iconElement}
      {children}
      {!isStart && iconElement}
    </>
  );

  const isLinkVariant = variant === "link";

  // Resolve tone color (used for link variant)
  const toneColor: string | undefined = (() => {
    switch (tone) {
      case "info":
        return "var(--interactive-accent)";
      case "success":
        return "var(--color-green, #2f9e44)";
      case "danger":
        return "var(--color-red, #d94848)";
      case "warning":
        return "var(--color-orange, #d97706)";
      default:
        return undefined;
    }
  })();
  const isPressed = pressed === true;
  const baseClasses = isLinkVariant
    ? [
        "mondo-button-link",
        fullWidth ? "flex" : "inline-flex",
        // When a tone is provided, avoid Tailwind text utilities that override color; use currentColor instead
        tone === "default"
          ? "items-center gap-1 bg-transparent border-0 p-0 m-0 text-left text-[var(--text-normal)] hover:text-[var(--interactive-accent)]"
          : "items-center gap-1 bg-transparent border-0 p-0 m-0 text-left text-current hover:text-current",
      ]
    : ["mondo-button"];

  if (fullWidth) {
    baseClasses.push("w-full");
  }

  const classes = [...baseClasses, className, isPressed ? "mondo-button--pressed" : null]
    .filter(Boolean)
    .join(" ");

  const pressedAttributes =
    typeof pressed === "boolean"
      ? ({
          "aria-pressed": pressed,
          "data-pressed": pressed ? "true" : "false",
        } as const)
      : {};

  // Compose styles: for link, default underline/transparent, merge caller props, apply tone color if provided
  const callerStyle = (rest.style as React.CSSProperties) || {};
  const computedColor =
    callerStyle.color ?? (isLinkVariant ? toneColor : undefined);
  const linkStyle: React.CSSProperties | undefined = isLinkVariant
    ? {
        cursor: rest.disabled ? undefined : "var(--cursor-link, pointer)",
        textDecorationLine: "var(--link-decoration, underline)",
        textDecorationThickness: "var(--link-decoration-thickness, 1px)",
        background: "transparent",
        boxShadow: "none",
        ...callerStyle,
        ...(computedColor ? { color: computedColor } : {}),
      }
    : callerStyle;

  // If `to` is provided, render a Link instead of a native button so it behaves as navigation
  if (to) {
    // If `to` is provided we'll render a native button that behaves like a link via useLink
    const restProps = { ...rest } as React.ButtonHTMLAttributes<HTMLButtonElement> & {
      [key: string]: unknown;
    };
    const onClick = restProps.onClick as
      | React.MouseEventHandler<HTMLButtonElement>
      | undefined;
    const disabled = restProps.disabled as boolean | undefined;
    const title = restProps.title as string | undefined;
    const ariaLabel = restProps["aria-label"] as string | undefined;
    delete restProps.onClick;
    delete restProps.disabled;
    delete restProps.title;
    delete restProps["aria-label"];
    const ref = React.useRef<HTMLButtonElement>(null);
    useLink(ref as any, to, {
      onClick: (e: MouseEvent) => onClick && onClick(e as any),
      disabled,
    });

    const [, setIsHover] = React.useState(false);

    const linkStyles: React.CSSProperties = isLinkVariant
      ? {
          ...linkStyle,
          // If a tone is specified, keep its color (no hover override). If default, let CSS classes handle color/hover.
          ...(tone !== "default"
            ? { color: linkStyle?.color as string | undefined }
            : {}),
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
        {...restProps}
        {...pressedAttributes}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      className={classes}
      style={linkStyle}
      {...(rest as any)}
      {...pressedAttributes}
    >
      {content}
    </button>
  );
};

export default Button;
