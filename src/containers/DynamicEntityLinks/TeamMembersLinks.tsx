import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

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

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="users"
      title="Members"
      subtitle={`People assigned to ${title}`}
    >
      <PeopleTable items={members} />
    </Card>
  );
};

const matchesTeam = (candidate: TCachedFile, teamPath: string, app: App) => {
  const candidateFrontmatter = candidate.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!candidateFrontmatter) return false;

  const rawTeams = candidateFrontmatter.team ?? candidateFrontmatter.teams;
  if (!rawTeams) return false;

  const teamValues = Array.isArray(rawTeams)
    ? rawTeams.map((v) => String(v))
    : [String(rawTeams)];

  const targetBase = teamPath.replace(/\.md$/i, "").trim();

  const normalize = (raw: string) => {
    let value = raw.trim();
    if (!value) return null;
    if (value.startsWith("[[") && value.endsWith("]]")) {
      value = value.slice(2, -2);
    }
    return value.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();
  };

  for (const teamRef of teamValues) {
    const normalized = normalize(teamRef);
    if (!normalized) continue;

    if (normalized === targetBase) return true;

    const resolved = app.metadataCache.getFirstLinkpathDest(
      normalized,
      candidate.file.path
    );
    if (!resolved) continue;

    const path = (resolved as any).path as string | undefined;
    if (path && path.replace(/\.md$/i, "") === targetBase) return true;

    const basename = (resolved as any).basename as string | undefined;
    if (basename && basename === targetBase) return true;
  }

  return false;
};
