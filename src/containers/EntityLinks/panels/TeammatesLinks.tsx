import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type TeammatesLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const TeammatesLinks = ({ file, config }: TeammatesLinksProps) => {
  const teamsInfo = useMemo(() => {
    const fm = file.cache?.frontmatter as Record<string, unknown> | undefined;
    if (!fm) return { hasTeams: false, teams: [] as string[] };

    const rawTeams = fm.team ?? fm.teams;
    if (!rawTeams) return { hasTeams: false, teams: [] as string[] };

    const teamValues = Array.isArray(rawTeams)
      ? rawTeams.map((v) => String(v))
      : [String(rawTeams)];

    const normalized = teamValues
      .map((raw) => {
        let value = raw.trim();
        if (!value) return null;
        if (value.startsWith("[[") && value.endsWith("]]")) {
          value = value.slice(2, -2);
        }
        value = value.split("|")[0].split("#")[0].replace(/\\.md$/i, "").trim();
        return value || null;
      })
      .filter(Boolean) as string[];

    return { hasTeams: normalized.length > 0, teams: normalized };
  }, [file.cache?.frontmatter]);

  const teammates = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, app: App) => {
        if (!file.file || teamsInfo.teams.length === 0) return false;
        if (candidate.file.path === file.file.path) return false;

        const candidateFrontmatter = candidate.cache?.frontmatter as
          | Record<string, unknown>
          | undefined;
        if (!candidateFrontmatter) return false;

        const rawTeams =
          candidateFrontmatter.team ?? candidateFrontmatter.teams;
        if (!rawTeams) return false;

        const candidateTeams = Array.isArray(rawTeams)
          ? rawTeams.map((v) => String(v))
          : [String(rawTeams)];

        const normalize = (raw: string) => {
          let value = raw.trim();
          if (value.startsWith("[[") && value.endsWith("]]")) {
            value = value.slice(2, -2);
          }
          value = value
            .split("|")[0]
            .split("#")[0]
            .replace(/\\.md$/i, "")
            .trim();
          return value;
        };

        for (const team of candidateTeams) {
          const normalized = normalize(team);
          if (!normalized) continue;
          if (teamsInfo.teams.includes(normalized)) return true;

          const resolved = app.metadataCache.getFirstLinkpathDest(
            normalized,
            candidate.file.path
          );
          if (!resolved) continue;
          const basename = (resolved as any).basename as string | undefined;
          if (basename && teamsInfo.teams.includes(basename)) return true;
          const path = (resolved as any).path as string | undefined;
          if (path) {
            const cleaned = path.replace(/\\.md$/i, "");
            if (teamsInfo.teams.includes(cleaned)) return true;
          }
        }

        return false;
      },
      [file.file, teamsInfo.teams]
    ),
  });

  if (!teamsInfo.hasTeams || teammates.length === 0) {
    return null;
  }

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="users"
      title="Teammates"
      subtitle={`People who share a team with ${file.file.basename}`}
    >
      <PeopleTable items={teammates} />
    </Card>
  );
};
