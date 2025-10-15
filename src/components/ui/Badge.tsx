import React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  ...rest
}) => {
  const classes = [
    "inline-flex",
    "min-w-[1.5rem]",
    "items-center",
    "justify-center",
    "rounded-full",
    "bg-[var(--interactive-accent)]",
    "px-2",
    "py-[2px]",
    "text-xs",
    "font-semibold",
    "leading-none",
    "text-[var(--text-on-accent, var(--text-normal))]",
    "shadow-sm",
  ];

  if (className) {
    classes.push(className);
  }

  return (
    <span className={classes.join(" ")} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
