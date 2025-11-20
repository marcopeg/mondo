import { useCallback, useMemo, useState } from "react";
import { Notice } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import { useApp } from "@/hooks/use-app";
import { useEntityFile } from "@/context/EntityFileProvider";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import type {
  MondoEntityFrontmatterConfig,
  MondoEntityFrontmatterFieldConfig,
} from "@/types/MondoEntityConfig";
import { isMondoEntityType } from "@/types/MondoFileType";
import { EntitySelectionModal } from "./EntitySelectionModal";

type AddPropertyProps = {
  frontmatterConfig: MondoEntityFrontmatterConfig;
  linkAnythingOn?: string | boolean;
};

type PropertyOption = {
  key: string;
  config: MondoEntityFrontmatterFieldConfig;
  auto: boolean;
};

export const AddProperty = ({ frontmatterConfig, linkAnythingOn }: AddPropertyProps) => {
  const app = useApp();
  const { file } = useEntityFile();
  const cachedFile = file as TCachedFile | undefined;

  const [selectedProperty, setSelectedProperty] =
    useState<PropertyOption | null>(null);

  // Expand frontmatter config with linkAnythingOn entries
  const expandedFrontmatterConfig = useMemo(() => {
    if (!linkAnythingOn) {
      return frontmatterConfig;
    }

    // Determine the target property key
    const targetKey = typeof linkAnythingOn === 'string' ? linkAnythingOn : 'linksTo';

    // Get all defined entity types from explicit frontmatter config
    const explicitTypes = new Set<string>();
    Object.values(frontmatterConfig).forEach((config) => {
      if (config.type === 'entity' && config.filter) {
        const filter = config.filter as any;
        const types = filter?.type?.in;
        if (Array.isArray(types)) {
          types.forEach((t) => explicitTypes.add(String(t).toLowerCase()));
        }
      }
    });

    // Build expanded config
    const expanded: MondoEntityFrontmatterConfig = { ...frontmatterConfig };

    // Add entries for all entity types not explicitly defined
    Object.entries(MONDO_ENTITIES).forEach(([entityType, entityConfig]) => {
      const typeLower = entityType.toLowerCase();
      
      // Skip if already explicitly defined
      if (explicitTypes.has(typeLower)) {
        return;
      }

      // Skip if an entry with this config key already exists
      if (expanded[entityType]) {
        return;
      }

      // Add auto-generated entry
      expanded[entityType] = {
        type: 'entity',
        title: entityConfig.singular || entityConfig.name,
        key: targetKey,
        filter: {
          type: {
            in: [typeLower],
          },
        },
        multiple: true,
      };
    });

    return expanded;
  }, [frontmatterConfig, linkAnythingOn]);

  // Filter properties to only show those that support picker interface (entity type)
  const pickerProperties = useMemo(() => {
    const properties: PropertyOption[] = [];
    const currentFrontmatter = cachedFile?.cache?.frontmatter || {};

    const explicitKeys = new Set(Object.keys(frontmatterConfig));
    Object.entries(expandedFrontmatterConfig).forEach(([configKey, config]) => {
      if (config.type === "entity") {
        // Use config.key if specified, otherwise fall back to configKey
        const targetKey = config.key || configKey;
        
        // Check if property is already set
        const currentValue = currentFrontmatter[targetKey];
        const isSet =
          currentValue !== undefined &&
          currentValue !== null &&
          currentValue !== "" &&
          !(Array.isArray(currentValue) && currentValue.length === 0);

        // If it's set and not multiple, skip it
        if (isSet && !config.multiple) {
          return;
        }

        properties.push({ key: configKey, config, auto: !explicitKeys.has(configKey) });
      }
    });
    return properties;
  }, [expandedFrontmatterConfig, cachedFile]);

  const handlePropertySelect = useCallback((property: PropertyOption) => {
    setSelectedProperty(property);
  }, []);

  const handleEntitySelect = useCallback(
    async (selectedFile: TCachedFile) => {
      if (!cachedFile || !selectedProperty) {
        return;
      }

      try {
        let linkText = app.metadataCache.fileToLinktext(
          selectedFile.file,
          cachedFile.file.path,
          false
        );
        // Remove .md extension if present
        linkText = linkText.replace(/\.md$/i, '');
        const wikiLink = `[[${linkText}]]`;

        await app.fileManager.processFrontMatter(
          cachedFile.file,
          (frontmatter) => {
            // Use config.key if specified, otherwise fall back to the config key
            const propertyKey = selectedProperty.config.key || selectedProperty.key;
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

  const explicitProperties = pickerProperties.filter(p => !p.auto);
  const autoProperties = pickerProperties.filter(p => p.auto);
  const primaryProperty = (explicitProperties[0] || autoProperties[0]) ?? pickerProperties[0];

  const secondaryActions = useMemo(() => {
    const actions: Array<any> = [];
    const explicitActions = explicitProperties.map((property) => ({
      label: property.config.title || property.key,
      onSelect: () => handlePropertySelect(property),
    }));
    const autoActions = autoProperties.map((property) => ({
      label: property.config.title || property.key,
      onSelect: () => handlePropertySelect(property),
    }));
    actions.push(...explicitActions);
    if (explicitActions.length > 0 && autoActions.length > 0) {
      actions.push({ separator: true });
    }
    actions.push(...autoActions);
    return actions;
  }, [explicitProperties, autoProperties, handlePropertySelect]);

  if (pickerProperties.length === 0) {
    return null;
  }

  return (
    <>
      <SplitButton
        onClick={() => handlePropertySelect(primaryProperty)}
        secondaryActions={secondaryActions}
        menuAriaLabel="Select property to add"
        icon="link"
      >
        {primaryProperty.config.title || primaryProperty.key}
      </SplitButton>

      {selectedProperty && cachedFile && (
        <EntitySelectionModal
          isOpen={true}
          onClose={handleCloseModal}
          onSelect={handleEntitySelect}
          config={selectedProperty.config}
          title={selectedProperty.config.title || selectedProperty.key}
          hostFile={cachedFile}
          propertyKey={selectedProperty.key}
        />
      )}
    </>
  );
};
