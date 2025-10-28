import { useEffect, useRef } from "react";
import { setIcon } from "obsidian";

type IconProps = {
  name?: string;
  className?: string;
};

export const Icon = ({ name, className }: IconProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Guard against undefined/empty icon names to avoid runtime errors inside Obsidian's setIcon
    const safe = typeof name === "string" && name.trim().length > 0;
    if (safe) {
      setIcon(ref.current, name!); // e.g. "dice", "building", "star"
    } else {
      // Clear any previous icon if name becomes empty/undefined
      ref.current.innerHTML = "";
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
