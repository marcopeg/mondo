import { useEntityFile } from "@/context/EntityFileProvider";
import { InlineError } from "@/components/InlineError";
import { CRM_ENTITIES, isCRMEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import type { CRMEntityLinkConfig } from "@/types/CRMEntityConfig";
import { TeammatesLinks } from "./TeammatesLinks";
import { TeamMembersLinks } from "./TeamMembersLinks";
import { MeetingsLinks } from "./MeetingsLinks";
import { TeamsLinks } from "./TeamsLinks";
import { EmployeesLinks } from "./EmployeesLinks";
import { ProjectsLinks } from "./ProjectsLinks";
import { ParticipantTasksLinks } from "./ParticipantTasksLinks";
import { RolePeopleLinks } from "./RolePeopleLinks";
import { RoleTasksLinks } from "./RoleTasksLinks";
import { Stack } from "@/components/ui/Stack";

type LinkPanelProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

const entityMap: Record<string, React.ComponentType<LinkPanelProps>> = {
  teammates: TeammatesLinks,
  "team-members": TeamMembersLinks,
  meetings: MeetingsLinks,
  teams: TeamsLinks,
  employees: EmployeesLinks,
  projects: ProjectsLinks,
  "participant-tasks": ParticipantTasksLinks,
  "role-people": RolePeopleLinks,
  "role-tasks": RoleTasksLinks,
};

const renderMissingConfigError = (message: string, key?: React.Key) => (
  <InlineError key={key} message={`DynamicEntityLinks: ${message}`} />
);

export const DynamicEntityLinks = () => {
  const { file } = useEntityFile();
  if (!file) {
    return null;
  }

  const entityType = file.cache?.frontmatter?.type;
  if (!entityType) {
    return renderMissingConfigError(
      "current file is missing a frontmatter type"
    );
  }

  if (!isCRMEntityType(entityType)) {
    return renderMissingConfigError(`unknown entity type "${entityType}"`);
  }

  const entityConfig = CRM_ENTITIES[entityType];

  const baseLinkConfigs = (entityConfig.links ?? []) as CRMEntityLinkConfig[];
  const hasParticipantTasksLink = baseLinkConfigs.some(
    (config) => config.type === "participant-tasks"
  );

  const linkConfigs = hasParticipantTasksLink
    ? baseLinkConfigs
    : [...baseLinkConfigs, { type: "participant-tasks" }];

  if (linkConfigs.length === 0) {
    return renderMissingConfigError(
      `no link configuration defined for "${entityType}"`
    );
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
          <Component
            key={`${type}-${index}`}
            file={file}
            config={panelConfig}
          />
        );
      })}
    </Stack>
  );
};
