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
  linkAnythingOn?: string | boolean | {
    key?: string;
    types?: string[];
  };
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
  const [modalOpenCount, setModalOpenCount] = useState(0);

  // Expand frontmatter config with linkAnythingOn entries
  const expandedFrontmatterConfig = useMemo(() => {
    if (!linkAnythingOn) {
      return frontmatterConfig;
    }

    // Parse linkAnythingOn configuration
    let targetKey = 'linksTo';
    let allowedTypes: string[] | null = null;
    
    if (typeof linkAnythingOn === 'string') {
      targetKey = linkAnythingOn;
    } else if (typeof linkAnythingOn === 'object') {
      targetKey = linkAnythingOn.key || 'linksTo';
      allowedTypes = linkAnythingOn.types || null;
    }

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

    // Determine which entity types to add and in what order
    let entityTypesToAdd: string[];
    
    if (allowedTypes && allowedTypes.length > 0) {
      // Use specified types in the specified order
      entityTypesToAdd = allowedTypes;
      
      // Warn about non-existent types
      allowedTypes.forEach((type) => {
        const typeLower = type.toLowerCase();
        if (!MONDO_ENTITIES[typeLower as MondoEntityType]) {
          console.warn(`[linkAnythingOn] Entity type "${type}" does not exist and will be ignored`);
        }
      });
    } else {
      // Use all entity types in alphabetical order
      entityTypesToAdd = Object.keys(MONDO_ENTITIES).sort((a, b) => {
        const nameA = MONDO_ENTITIES[a as MondoEntityType].singular || MONDO_ENTITIES[a as MondoEntityType].name;
        const nameB = MONDO_ENTITIES[b as MondoEntityType].singular || MONDO_ENTITIES[b as MondoEntityType].name;
        return nameA.localeCompare(nameB);
      });
    }

    // Add entries for entity types
    entityTypesToAdd.forEach((entityType) => {
      const typeLower = entityType.toLowerCase();
      const entityConfig = MONDO_ENTITIES[typeLower as MondoEntityType];
      
      // Skip if entity type doesn't exist
      if (!entityConfig) {
        return;
      }
      
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
        icon: entityConfig.icon,
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
    setModalOpenCount(prev => prev + 1);
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

            // Always store values as arrays
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
      icon: property.config.icon,
      onSelect: () => handlePropertySelect(property),
    }));
    const autoActions = autoProperties.map((property) => ({
      label: property.config.title || property.key,
      icon: property.config.icon,
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
          openCount={modalOpenCount}
        />
      )}
    </>
  );
};
