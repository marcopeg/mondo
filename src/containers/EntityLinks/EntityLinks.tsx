import { useEntityFile } from "@/context/EntityFileProvider";
import { InlineError } from "@/components/InlineError";
import { CRM_ENTITIES, isCRMEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import type { CRMEntityLinkConfig } from "@/types/CRMEntityConfig";
import { Stack } from "@/components/ui/Stack";
import { TeammatesLinks } from "./panels/TeammatesLinks";
import { TeamMembersLinks } from "./panels/TeamMembersLinks";
import { MeetingsLinks } from "./panels/MeetingsLinks";
import { TeamsLinks } from "./panels/TeamsLinks";
import { EmployeesLinks } from "./panels/EmployeesLinks";
import { ProjectsLinks } from "./panels/ProjectsLinks";
import { ParticipantTasksLinks } from "./panels/ParticipantTasksLinks";
import { RolePeopleLinks } from "./panels/RolePeopleLinks";
import { RoleTasksLinks } from "./panels/RoleTasksLinks";
import { ParticipantsAssignmentLinks } from "./panels/ParticipantsAssignmentLinks";
import { FactsLinks } from "./panels/FactsLinks";
import { LogsLinks } from "./panels/LogsLinks";
import { LocationPeopleLinks } from "./panels/LocationPeopleLinks";
import { LocationCompaniesLinks } from "./panels/LocationCompaniesLinks";
import { TaskSubtasksLinks } from "./panels/TaskSubtasksLinks";
import { ProjectTasksLinks } from "./panels/ProjectTasksLinks";
import { MeetingTasksLinks } from "./panels/MeetingTasksLinks";
import { CompanyTasksLinks } from "./panels/CompanyTasksLinks";
import { TeamTasksLinks } from "./panels/TeamTasksLinks";
import { DocumentsLinks } from "./panels/DocumentsLinks";

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
  "participants-assignment": ParticipantsAssignmentLinks,
  facts: FactsLinks,
  logs: LogsLinks,
  "location-people": LocationPeopleLinks,
  "location-companies": LocationCompaniesLinks,
  "task-subtasks": TaskSubtasksLinks,
  "project-tasks": ProjectTasksLinks,
  "meeting-tasks": MeetingTasksLinks,
  "company-tasks": CompanyTasksLinks,
  "team-tasks": TeamTasksLinks,
  documents: DocumentsLinks,
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

  if (!isCRMEntityType(entityType)) {
    return renderMissingConfigError(`unknown entity type "${entityType}"`);
  }

  const entityConfig = CRM_ENTITIES[entityType];

  const baseLinkConfigs = (entityConfig.links ?? []) as CRMEntityLinkConfig[];

  // Auto-append participant-tasks panel only for person entities
  const shouldAutoAppendParticipantTasks = entityType === "person";
  const hasParticipantTasksLink = baseLinkConfigs.some(
    (config) => config.type === "participant-tasks"
  );

  const linkConfigs =
    shouldAutoAppendParticipantTasks && !hasParticipantTasksLink
      ? [...baseLinkConfigs, { type: "participant-tasks" }]
      : baseLinkConfigs;

  if (linkConfigs.length === 0) {
    if (entityType === "document") {
      return null;
    }
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
