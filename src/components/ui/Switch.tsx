import React from "react";

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  checkedLabel?: string;
  uncheckedLabel?: string;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "aria-labelledby" | "title" | "disabled">;

const labelClassName = (active: boolean) =>
  [
    "text-xs",
    "uppercase",
    "tracking-wide",
    active ? "text-[var(--text-normal)] font-semibold" : "text-[var(--text-muted)]",
  ].join(" ");

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  id,
  className,
  checkedLabel = "On",
  uncheckedLabel = "Off",
  disabled,
  ...ariaProps
}) => {
  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }
    onCheckedChange(!checked);
  }, [checked, disabled, onCheckedChange]);

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      {...ariaProps}
      className={["flex items-center gap-2", className]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      disabled={disabled}
    >
      <span className={labelClassName(!checked)}>{uncheckedLabel}</span>
      <span
        className={[
          "relative inline-flex h-4 w-8 items-center rounded-full border border-[var(--background-modifier-border)]",
          checked
            ? "bg-[var(--interactive-accent)]"
            : "bg-[var(--background-modifier-border)]",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        <span
          className={[
            "absolute left-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--background-primary)] shadow transition-transform",
            checked ? "translate-x-3" : "translate-x-0",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </span>
      <span className={labelClassName(checked)}>{checkedLabel}</span>
    </button>
  );
};

export default Switch;
