import { useEntityFile } from "@/context/EntityFileProvider";
import { InlineError } from "@/components/InlineError";

import { PersonLinks } from "./PersonLinks";
import { CompanyLinks } from "./CompanyLinks";
import { ProjectLinks } from "./ProjectLinks";
import { TeamLinks } from "./TeamLinks";
import { RoleLinks } from "./RoleLinks";
import { LocationLinks } from "./LocationLinks";

const entityMap: Record<string, React.ComponentType> = {
  person: PersonLinks,
  company: CompanyLinks,
  project: ProjectLinks,
  team: TeamLinks,
  role: RoleLinks,
  location: LocationLinks,
};

export const EntityLinks = () => {
  const { file } = useEntityFile();
  if (!file) {
    return null;
  }

  const entityType = file.cache?.frontmatter?.type;
  const EntityComponent = entityType ? entityMap[entityType] : null;

  if (EntityComponent) {
    return <EntityComponent />;
  }

  return (
    <InlineError
      message={`entity "${
        entityType ?? "unknown"
      }" unknown`}
    />
  );
};
