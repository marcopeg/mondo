import React, { useEffect } from "react";
import { useApp } from "@/hooks/use-app";

interface LinkProps {
  to: string; // vault-relative path, e.g. "Mondo/People/Jakob.md"
  children: React.ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
}

interface UseLinkOptions {
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
}

// hook: attach link behavior to a DOM element via ref
export const useLink = (
  domRef: React.RefObject<HTMLElement>,
  to: string,
  options?: UseLinkOptions
) => {
  const app = useApp();

  useEffect(() => {
    const el = domRef.current;
    if (!el) return;

    const handleClick = async (ev: Event) => {
      const e = ev as MouseEvent;
      if (options?.disabled) return;
      ev.preventDefault();

      try {
        const isCmdOrCtrl = (e as any).metaKey || (e as any).ctrlKey;
        const plainPath = to;
        if (isCmdOrCtrl) {
          try {
            await app.workspace.openLinkText(plainPath, "", "split");
            return;
          } catch (err) {
            const leaf = app.workspace.getLeaf(true);
            if (leaf) await (leaf as any).openFile(app.vault.getAbstractFileByPath(plainPath));
            return;
          }
        }

        const activeLeaf = app.workspace.getLeaf(false) || app.workspace.getLeaf(true);
        const file = app.vault.getAbstractFileByPath(plainPath);
        if (activeLeaf && file) await (activeLeaf as any).openFile(file);
      } catch (err) {
        console.error("useLink: failed to open file", err);
      }

      if (options?.onClick) options.onClick(e);
    };

    const handleKey = (ev: KeyboardEvent) => {
      if (options?.disabled) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        handleClick(ev as any as Event);
      }
    };

    // set attributes so Obsidian hover/preview can bind to the node
    el.classList.add("internal-link", "cm-hmd-internal-link");
    el.setAttribute("data-href", to);
    el.setAttribute("data-path", to);
    if ((options && options.disabled) || (el as any).disabled) {
      el.setAttribute("aria-disabled", "true");
    }

    el.addEventListener("click", handleClick);
    el.addEventListener("keydown", handleKey);

    return () => {
      el.removeEventListener("click", handleClick);
      el.removeEventListener("keydown", handleKey);
      el.classList.remove("internal-link", "cm-hmd-internal-link");
      el.removeAttribute("data-href");
      el.removeAttribute("data-path");
      el.removeAttribute("aria-disabled");
    };
  }, [domRef, to, app, options?.disabled]);
};

export const Link = ({ to, children, className, onClick, disabled }: LinkProps) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  useLink(ref as React.RefObject<HTMLElement>, to, { onClick: onClick as any, disabled });

  return (
    <span
      ref={ref}
      className={className}
      style={{ cursor: disabled ? undefined : "pointer" }}
    >
      {children}
    </span>
  );
};

export default Link;
