import { useCallback, useMemo } from "react";
import type { App } from "obsidian";
import { Notice } from "obsidian";
import { SplitButton } from "@/components/ui/SplitButton";
import {
  CRM_ENTITIES,
  CRM_ENTITY_TYPES,
  type CRMEntityType,
} from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";

const buildEntityOptions = () =>
  CRM_ENTITY_TYPES.map((type) => ({
    type,
    label: CRM_ENTITIES[type]?.name ?? type,
    icon: CRM_ENTITIES[type]?.icon,
  }))
    .sort((a, b) => a.label.localeCompare(b.label));

type UnknownEntityHeaderProps = {
  app: App;
  file?: TCachedFile;
};

export const UnknownEntityHeader = ({ app, file }: UnknownEntityHeaderProps) => {
  const options = useMemo(buildEntityOptions, []);

  const handleSelect = useCallback(
    async (nextType: CRMEntityType) => {
      if (!file?.file) {
        new Notice("Unable to update note type. Please save the note and try again.");
        return;
      }

      try {
        await app.fileManager.processFrontMatter(file.file, (frontmatter) => {
          frontmatter.type = nextType;
        });
      } catch (error) {
        console.error("UnknownEntityHeader: failed to assign CRM type", error);
        new Notice("Failed to update the note type.");
      }
    },
    [app, file?.file]
  );

  const secondaryActions = useMemo(
    () =>
      options.map((option) => ({
        label: option.label,
        icon: option.icon,
        onSelect: () => {
          void handleSelect(option.type);
        },
      })),
    [handleSelect, options]
  );

  return (
    <SplitButton
      type="button"
      icon="plus"
      menuAriaLabel="Select CRM note type"
      secondaryActions={secondaryActions}
      primaryOpensMenu
      disabled={secondaryActions.length === 0}
    >
      Create as CRM Note
    </SplitButton>
  );
};

export default UnknownEntityHeader;
