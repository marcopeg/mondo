import { useEntityFile } from "@/context/EntityFileProvider";
import { InlineError } from "@/components/InlineError";
import { MONDO_ENTITIES, isMondoEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import type { MondoEntityLinkConfig } from "@/types/MondoEntityConfig";
import { Stack } from "@/components/ui/Stack";
import { BacklinksLinks } from "./panels/BacklinksLinks";

type LinkPanelProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

const entityMap: Record<string, React.ComponentType<LinkPanelProps>> = {
  backlinks: BacklinksLinks,
};

const renderMissingConfigError = (message: string, key?: React.Key) => (
  <InlineError key={key} message={`EntityLinks: ${message}`} />
);

export const EntityLinks = () => {
  const { file } = useEntityFile();
  if (!file) {
    return null;
  }

  const frontmatter = file.cache?.frontmatter;
  if (!frontmatter) {
    return null;
  }

  const rawEntityType = frontmatter?.type;
  if (!rawEntityType) {
    return renderMissingConfigError(
      "current file is missing a frontmatter type"
    );
  }

  const entityType = String(rawEntityType).trim().toLowerCase();

  if (!isMondoEntityType(entityType)) {
    return renderMissingConfigError(`unknown entity type "${entityType}"`);
  }

  const entityConfig = MONDO_ENTITIES[entityType];

  const linkConfigs = (entityConfig.links ?? []) as MondoEntityLinkConfig[];

  if (linkConfigs.length === 0) {
    return null;
  }

  return (
    <Stack direction="column" gap={2}>
      {linkConfigs.map((linkConfig, index) => {
        const Component = entityMap[linkConfig.type];
        if (!Component) {
          return renderMissingConfigError(
            `no renderer registered for link type "${linkConfig.type}"`,
            `${linkConfig.type}-${index}`
          );
        }

        const { type, ...panelConfig } = linkConfig;
        return (
          <div
            key={`${type}-${index}`}
            data-entity-panel={type}
            className="flex flex-col"
          >
            <Component file={file} config={panelConfig} />
          </div>
        );
      })}
    </Stack>
  );
};
