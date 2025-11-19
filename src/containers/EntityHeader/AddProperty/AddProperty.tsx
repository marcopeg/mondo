import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "obsidian";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/hooks/use-app";
import { useEntityFile } from "@/context/EntityFileProvider";
import type { TCachedFile } from "@/types/TCachedFile";
import type {
  MondoEntityFrontmatterConfig,
  MondoEntityFrontmatterFieldConfig,
} from "@/types/MondoEntityConfig";
import { EntitySelectionModal } from "./EntitySelectionModal";

type AddPropertyProps = {
  frontmatterConfig: MondoEntityFrontmatterConfig;
};

type PropertyOption = {
  key: string;
  config: MondoEntityFrontmatterFieldConfig;
};

export const AddProperty = ({ frontmatterConfig }: AddPropertyProps) => {
  const app = useApp();
  const { file } = useEntityFile();
  const cachedFile = file as TCachedFile | undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyOption | null>(null);

  // Filter properties to only show those that support picker interface (entity type)
  const pickerProperties = useMemo(() => {
    const properties: PropertyOption[] = [];
    Object.entries(frontmatterConfig).forEach(([key, config]) => {
      if (config.type === "entity") {
        properties.push({ key, config });
      }
    });
    return properties;
  }, [frontmatterConfig]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleButtonClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handlePropertySelect = useCallback((property: PropertyOption) => {
    setIsOpen(false);
    setSelectedProperty(property);
  }, []);

  const handleEntitySelect = useCallback(
    async (selectedFile: TCachedFile) => {
      if (!cachedFile || !selectedProperty) {
        return;
      }

      try {
        const linkText = app.metadataCache.fileToLinktext(
          selectedFile.file,
          cachedFile.file.path,
          false
        );
        const wikiLink = `[[${linkText}]]`;

        await app.fileManager.processFrontMatter(
          cachedFile.file,
          (frontmatter) => {
            const propertyKey = selectedProperty.key;
            const existing = (frontmatter as any)[propertyKey];

            if (selectedProperty.config.multiple) {
              // Multiple values allowed - add to array
              if (Array.isArray(existing)) {
                const has = existing.some(
                  (e) => String(e).trim() === wikiLink
                );
                if (!has) {
                  existing.push(wikiLink);
                }
              } else if (existing === undefined || existing === null) {
                (frontmatter as any)[propertyKey] = [wikiLink];
              } else {
                const val = String(existing).trim();
                const arr = val ? [val] : [];
                if (!arr.includes(wikiLink)) {
                  arr.push(wikiLink);
                }
                (frontmatter as any)[propertyKey] = arr;
              }
            } else {
              // Single value - replace
              (frontmatter as any)[propertyKey] = wikiLink;
            }
          }
        );

        new Notice(
          `Added ${selectedProperty.config.title || selectedProperty.key} property`
        );
      } catch (error) {
        console.error("AddProperty: failed to add property", error);
        new Notice("Failed to add property.");
      } finally {
        setSelectedProperty(null);
      }
    },
    [app, cachedFile, selectedProperty]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  if (pickerProperties.length === 0) {
    return null;
  }

  const menuClasses = [
    "absolute left-0 top-full z-[999] mt-1 min-w-[10rem] overflow-hidden rounded-md border border-[var(--background-modifier-border-hover)] bg-[var(--background-primary)] shadow-lg py-1",
    "divide-y divide-[var(--background-modifier-border-hover)]",
  ].join(" ");

  return (
    <>
      <div ref={containerRef} className="relative inline-flex">
        <Button
          onClick={handleButtonClick}
          variant="button"
          className="text-xs px-2 py-1"
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <Icon name="plus" className="h-3.5 w-3.5 mr-1" />
          Add property
        </Button>

        {isOpen && (
          <div className={menuClasses} role="menu">
            {pickerProperties.map((property) => (
              <Button
                key={property.key}
                type="button"
                role="menuitem"
                onClick={() => handlePropertySelect(property)}
                variant="link"
                fullWidth
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] focus:bg-[var(--background-modifier-hover)] rounded-none text-left"
                style={{ ["--link-decoration"]: "none" } as React.CSSProperties}
              >
                <span className="flex-1 text-left">
                  {property.config.title || property.key}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedProperty && cachedFile && (
        <EntitySelectionModal
          isOpen={true}
          onClose={handleCloseModal}
          onSelect={handleEntitySelect}
          config={selectedProperty.config}
          title={selectedProperty.config.title || selectedProperty.key}
          hostFile={cachedFile}
        />
      )}
    </>
  );
};
