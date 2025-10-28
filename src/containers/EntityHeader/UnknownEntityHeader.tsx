import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { App } from "obsidian";
import { Notice } from "obsidian";
import Button from "@/components/ui/Button";
import {
  CRM_ENTITIES,
  CRM_ENTITY_TYPES,
  type CRMEntityType,
} from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";

const buildEntityOptions = () =>
  CRM_ENTITY_TYPES.map((type) => ({
    type,
    label: CRM_ENTITIES[type].name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

type UnknownEntityHeaderProps = {
  app: App;
  file?: TCachedFile;
};

export const UnknownEntityHeader = ({ app, file }: UnknownEntityHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const options = useMemo(buildEntityOptions, []);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
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

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    async (nextType: CRMEntityType) => {
      if (!file?.file) {
        new Notice("Unable to update note type. Please save the note and try again.");
        closeMenu();
        return;
      }

      try {
        await app.fileManager.processFrontMatter(file.file, (frontmatter) => {
          frontmatter.type = nextType;
        });
      } catch (error) {
        console.error("UnknownEntityHeader: failed to assign CRM type", error);
        new Notice("Failed to update the note type.");
      } finally {
        closeMenu();
      }
    },
    [app, closeMenu, file?.file]
  );

  const buttonClasses = "relative inline-flex";
  const menuClasses = [
    "absolute right-0 top-full z-[999] mt-2 min-w-[12rem]",
    "overflow-hidden rounded-md border border-[var(--background-modifier-border)]",
    "bg-[var(--background-primary)] shadow-lg",
  ].join(" ");

  return (
    <div ref={menuRef} className={buttonClasses}>
      <Button
        type="button"
        icon="plus"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        Create as CRM Note
      </Button>
      {isOpen && (
        <div role="menu" className={menuClasses}>
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]"
              onClick={() => handleSelect(option.type)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnknownEntityHeader;
