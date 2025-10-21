import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";
import { matchesTeam } from "@/utils/matchesTeam";

type TeamMembersLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const TeamMembersLinks = ({ file, config }: TeamMembersLinksProps) => {
  const members = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, app: App) => {
        if (!file.file) return false;
        return matchesTeam(candidate, file.file.path, app);
      },
      [file.file]
    ),
  });

  if (members.length === 0) {
    return null;
  }

  const title = file.cache?.frontmatter?.show ?? file.file.basename;

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="users"
      title="Members"
      subtitle={`People assigned to ${title}`}
    >
      <PeopleTable items={members} />
    </Card>
  );
};
