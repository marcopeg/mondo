import { useEffect, useRef } from "react";
import { setIcon } from "obsidian";

type IconProps = {
  name: string;
  className?: string;
};

export const Icon = ({ name, className }: IconProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, name); // e.g. "dice", "building", "star"
    }
  }, [name]);

  const classes = [
    "inline-flex items-center justify-center w-5 h-5",
    className ?? "mr-2",
  ]
    .filter(Boolean)
    .join(" ");

  return <span ref={ref} className={classes} aria-hidden />;
};
