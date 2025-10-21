import type { App } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

const normalizeLinkValue = (raw: string): string | null => {
  let value = raw.trim();
  if (!value) return null;
  if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
  }
  return value.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();
};

export const matchesTeam = (
  candidate: TCachedFile,
  teamPath: string,
  app: App
): boolean => {
  const candidateFrontmatter = candidate.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!candidateFrontmatter) return false;

  const rawTeams = candidateFrontmatter.team ?? candidateFrontmatter.teams;
  if (!rawTeams) return false;

  const teamValues = Array.isArray(rawTeams)
    ? rawTeams.map((value) => String(value))
    : [String(rawTeams)];

  const targetBase = teamPath.replace(/\.md$/i, "").trim();

  for (const teamRef of teamValues) {
    const normalized = normalizeLinkValue(teamRef);
    if (!normalized) continue;

    if (normalized === targetBase) {
      return true;
    }

    const resolved = app.metadataCache.getFirstLinkpathDest(
      normalized,
      candidate.file.path
    );
    if (!resolved) continue;

    const path = (resolved as any).path as string | undefined;
    if (path && path.replace(/\.md$/i, "") === targetBase) {
      return true;
    }

    const basename = (resolved as any).basename as string | undefined;
    if (basename && basename === targetBase) {
      return true;
    }
  }

  return false;
};

export default matchesTeam;
