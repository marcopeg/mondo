import { useCallback, useMemo, useState } from "react";
import { Notice } from "obsidian";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
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

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
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

  const handleButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handleClosePopover = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handlePropertySelect = useCallback((property: PropertyOption) => {
    setAnchorEl(null);
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

  return (
    <>
      <Button
        onClick={handleButtonClick}
        variant="button"
        className="text-xs px-2 py-1"
      >
        <Icon name="plus" className="h-3.5 w-3.5 mr-1" />
        Add property
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        offset={{ vertical: 8 }}
      >
        <div
          className="min-w-[200px] rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] shadow-lg"
          role="menu"
        >
          {pickerProperties.map((property) => (
            <button
              key={property.key}
              type="button"
              onClick={() => handlePropertySelect(property)}
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] first:rounded-t-md last:rounded-b-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-inset"
              role="menuitem"
            >
              {property.config.title || property.key}
            </button>
          ))}
        </div>
      </Popover>

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
