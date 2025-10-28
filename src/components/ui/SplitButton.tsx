import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type SplitButtonAction = {
  label: ReactNode;
  onSelect: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  icon?: string;
  disabled?: boolean;
};

type SplitButtonProps = React.ComponentProps<typeof Button> & {
  secondaryActions: SplitButtonAction[];
  toggleClassName?: string;
  menuAriaLabel?: string;
  primaryOpensMenu?: boolean;
};

export const SplitButton = ({
  secondaryActions,
  toggleClassName,
  menuAriaLabel = "Open secondary actions",
  primaryOpensMenu = false,
  disabled,
  fullWidth = false,
  className,
  children,
  iconClassName,
  ...buttonProps
}: SplitButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { onClick, ...restButtonProps } = buttonProps;

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  const availableSecondaryActions = useMemo(
    () => secondaryActions.filter((action) => !action.disabled),
    [secondaryActions]
  );

  useEffect(() => {
    if (isOpen && availableSecondaryActions.length === 0) {
      setIsOpen(false);
    }
  }, [availableSecondaryActions.length, isOpen]);

  const menuDisabled = disabled || secondaryActions.length === 0;

  const handleToggleMenu = useCallback(() => {
    if (menuDisabled) {
      return;
    }
    setIsOpen((prev) => !prev);
  }, [menuDisabled]);

  const handlePrimaryClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (primaryOpensMenu) {
        if (menuDisabled) {
          event.preventDefault();
          return;
        }
        setIsOpen((prev) => !prev);
      }

      if (onClick) {
        onClick(event);
      }
    },
    [menuDisabled, onClick, primaryOpensMenu]
  );

  const handleActionSelect = useCallback(
    (action: SplitButtonAction) =>
      (event: ReactMouseEvent<HTMLButtonElement>) => {
        if (action.disabled) {
          return;
        }
        closeMenu();
        action.onSelect(event);
      },
    [closeMenu]
  );

  const primaryAriaProps = primaryOpensMenu
    ? ({
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
      } as const)
    : {};

  const containerClasses = [
    "relative inline-flex items-stretch",
    fullWidth ? "w-full" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const mainButtonClasses = [
    className,
    secondaryActions.length > 0 ? "rounded-r-none" : undefined,
    fullWidth && secondaryActions.length > 0 ? "flex-1" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const toggleButtonClasses = [
    "rounded-l-none border-l border-[var(--background-modifier-border-hover)] px-2",
    className,
    toggleClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const menuClasses = [
    "absolute right-0 top-full z-[999] mt-1 min-w-[10rem] overflow-hidden rounded-md border border-[var(--background-modifier-border-hover)] bg-[var(--background-primary)] shadow-lg py-1",
    // subtle separators between items
    "divide-y divide-[var(--background-modifier-border-hover)]",
  ].join(" ");

  // Focus first enabled item when menu opens
  useEffect(() => {
    if (!isOpen) return;
    const list = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled)'
    );
    const first = list && list.length > 0 ? list[0] : null;
    if (first) requestAnimationFrame(() => first.focus());
  }, [isOpen]);

  const focusItemAt = useCallback((idx: number) => {
    const list = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled)'
    );
    if (!list || list.length === 0) return;
    const el = list[idx];
    if (el) el.focus();
  }, []);

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const nodes = menuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      );
      const enabled = nodes ? Array.from(nodes) : [];
      if (enabled.length === 0) return;

      const active = document.activeElement as HTMLButtonElement | null;
      const currentIndex = active ? enabled.indexOf(active) : -1;
      const firstIndex = 0;
      const lastIndex = enabled.length - 1;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          closeMenu();
          break;
        case "ArrowDown":
          event.preventDefault();
          focusItemAt(
            currentIndex === -1 || currentIndex === lastIndex
              ? firstIndex
              : currentIndex + 1
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          focusItemAt(
            currentIndex === -1 || currentIndex === firstIndex
              ? lastIndex
              : currentIndex - 1
          );
          break;
        case "Home":
          event.preventDefault();
          focusItemAt(firstIndex);
          break;
        case "End":
          event.preventDefault();
          focusItemAt(lastIndex);
          break;
        case "Tab":
          // close on tab to integrate with flow
          closeMenu();
          break;
        default:
          break;
      }
    },
    [closeMenu, focusItemAt, secondaryActions]
  );

  return (
    <div ref={containerRef} className={containerClasses}>
      <Button
        {...restButtonProps}
        {...primaryAriaProps}
        disabled={disabled}
        className={mainButtonClasses}
        fullWidth={secondaryActions.length === 0 ? fullWidth : false}
        iconClassName={iconClassName}
        onClick={handlePrimaryClick}
      >
        {children}
      </Button>
      {secondaryActions.length > 0 && (
        <Button
          type="button"
          icon="chevron-down"
          iconClassName="mr-0"
          aria-label={menuAriaLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={handleToggleMenu}
          disabled={menuDisabled || availableSecondaryActions.length === 0}
          className={toggleButtonClasses}
        >
          <span className="sr-only">{menuAriaLabel}</span>
        </Button>
      )}
      {isOpen && availableSecondaryActions.length > 0 && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuAriaLabel}
          className={menuClasses}
          onKeyDown={handleMenuKeyDown}
        >
          {secondaryActions.map((action, index) => {
            const isActionDisabled = Boolean(action.disabled);
            return (
              <Button
                key={`${action.label?.toString() ?? index}-${index}`}
                type="button"
                role="menuitem"
                disabled={isActionDisabled}
                onClick={handleActionSelect(action)}
                variant="link"
                fullWidth
                icon={action.icon}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] focus:bg-[var(--background-modifier-hover)] rounded-none"
                style={{ ["--link-decoration"]: "none" } as React.CSSProperties}
              >
                <span className="flex-1 text-left">{action.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SplitButton;
