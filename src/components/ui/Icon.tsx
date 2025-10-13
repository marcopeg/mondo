import { useEffect, useRef } from "react";
import { setIcon } from "obsidian";

export const Icon = ({ name }: { name: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, name); // e.g. "dice", "building", "star"
    }
  }, [name]);

  return (
    <span
      ref={ref}
      className="inline-flex items-center justify-center w-5 h-5 mr-2"
      aria-hidden
    />
  );
};
