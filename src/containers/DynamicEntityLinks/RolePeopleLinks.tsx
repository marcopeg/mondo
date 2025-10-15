import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type RolePeopleLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

export const RolePeopleLinks = ({ file, config }: RolePeopleLinksProps) => {
  const people = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) {
          return false;
        }
        return matchesAnyPropertyLink(candidate, ["role", "roles"], file.file);
      },
      [file.file]
    ),
  });

  if (people.length === 0) {
    return null;
  }

  const roleName = getEntityDisplayName(file);

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="users"
      title="People"
      subtitle={`People linked to ${roleName}`}
      p={0}
    >
      <PeopleTable items={people} />
    </Card>
  );
};

export default RolePeopleLinks;
