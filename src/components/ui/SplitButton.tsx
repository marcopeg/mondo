import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
};

export const SplitButton = ({
  secondaryActions,
  toggleClassName,
  menuAriaLabel = "Open secondary actions",
  disabled,
  fullWidth = false,
  className,
  children,
  iconClassName,
  ...buttonProps
}: SplitButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleActionSelect = useCallback(
    (action: SplitButtonAction) => (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (action.disabled) {
        return;
      }
      closeMenu();
      action.onSelect(event);
    },
    [closeMenu]
  );

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
    "absolute right-0 top-full z-[999] mt-1 min-w-[10rem] overflow-hidden rounded-md border border-[var(--background-modifier-border-hover)] bg-[var(--background-primary)] shadow-lg",
  ].join(" ");

  return (
    <div ref={containerRef} className={containerClasses}>
      <Button
        {...buttonProps}
        disabled={disabled}
        className={mainButtonClasses}
        fullWidth={secondaryActions.length === 0 ? fullWidth : false}
        iconClassName={iconClassName}
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
        <div role="menu" className={menuClasses}>
          {secondaryActions.map((action, index) => {
            const isActionDisabled = Boolean(action.disabled);
            return (
              <button
                key={`${action.label?.toString() ?? index}-${index}`}
                type="button"
                role="menuitem"
                disabled={isActionDisabled}
                onClick={handleActionSelect(action)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] disabled:cursor-not-allowed disabled:text-[var(--text-faint)]"
              >
                {action.icon && <Icon name={action.icon} />}
                <span className="flex-1 text-left">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SplitButton;
