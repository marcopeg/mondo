import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import TeamsTable from "@/components/TeamsTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type TeamsLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const TeamsLinks = ({ file, config }: TeamsLinksProps) => {
  const teams = useFiles(CRMFileType.TEAM, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "company", file.file);
      },
      [file.file]
    ),
  });

  if (teams.length === 0) {
    return null;
  }

  const companyName =
    (file.cache?.frontmatter?.show as string | undefined) ??
    (file.cache?.frontmatter?.name as string | undefined) ??
    file.file.basename;

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="users"
      title="Teams"
      subtitle={`Teams linked to ${companyName}`}
    >
      <TeamsTable items={teams} />
    </Card>
  );
};
