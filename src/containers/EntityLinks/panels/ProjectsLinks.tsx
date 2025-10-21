import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import ProjectsTable from "@/components/ProjectsTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";
import { getProjectDisplayLabel } from "@/utils/getProjectDisplayInfo";

type ProjectsLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const ProjectsLinks = ({ file, config }: ProjectsLinksProps) => {
  const app = useApp();

  const entityType = file.cache?.frontmatter?.type;

  const personTeamRefs = useMemo(() => {
    if (!file.file || entityType !== "person") return new Set<string>();

    const fm = file.cache?.frontmatter as Record<string, unknown> | undefined;
    const rawTeams = fm?.team ?? fm?.teams;
    if (!rawTeams) return new Set<string>();

    const values = Array.isArray(rawTeams)
      ? rawTeams.map((v) => String(v))
      : [String(rawTeams)];

    const resolved = new Set<string>();

    values.forEach((value) => {
      const normalized = normalizeRef(value);
      if (!normalized) return;

      expandRefVariants(normalized, app, file.file!.path).forEach((variant) =>
        resolved.add(variant)
      );
    });

    return resolved;
  }, [app, entityType, file.cache?.frontmatter, file.file]);

  const projects = useFiles(CRMFileType.PROJECT, {
    filter: useCallback(
      (projectCached: TCachedFile, appInstance: App) => {
        if (!file.file || !entityType) return false;

        switch (entityType) {
          case "company":
            return matchesPropertyLink(projectCached, "company", file.file);
          case "team":
            return (
              matchesPropertyLink(projectCached, "team", file.file) ||
              matchesPropertyLink(projectCached, "teams", file.file)
            );
          case "person":
            if (matchesPropertyLink(projectCached, "participants", file.file)) {
              return true;
            }

            if (personTeamRefs.size === 0) {
              return false;
            }

            const projectFm = projectCached.cache?.frontmatter as
              | Record<string, unknown>
              | undefined;
            if (!projectFm) return false;

            const rawTeamRefs = projectFm.team ?? projectFm.teams;
            if (!rawTeamRefs) return false;

            const teamValues = Array.isArray(rawTeamRefs)
              ? rawTeamRefs.map((v) => String(v))
              : [String(rawTeamRefs)];

            for (const ref of teamValues) {
              const normalized = normalizeRef(ref);
              if (!normalized) continue;

              const variants = expandRefVariants(
                normalized,
                appInstance,
                projectCached.file.path
              );

              for (const variant of variants) {
                if (personTeamRefs.has(variant)) {
                  return true;
                }
              }
            }

            return false;
          default:
            return false;
        }
      },
      [entityType, file.file, personTeamRefs]
    ),
  });

  const validProjects = useMemo(
    () => projects.filter((project) => Boolean(project.file)),
    [projects]
  );

  const getProjectId = useCallback(
    (project: TCachedFile) => project.file?.path,
    []
  );

  const sortProjectsByLabel = useCallback((entries: TCachedFile[]) => {
    return [...entries].sort((a, b) => {
      const labelA = getProjectDisplayLabel(a).toLowerCase();
      const labelB = getProjectDisplayLabel(b).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, []);

  const {
    items: orderedProjects,
    onReorder,
    sortable,
  } = useEntityLinkOrdering({
    file,
    items: validProjects,
    frontmatterKey: "projects",
    getItemId: getProjectId,
    fallbackSort: sortProjectsByLabel,
  });

  if (validProjects.length === 0) {
    return null;
  }

  const displayName = getDisplayName(file);

  const subtitle = (() => {
    switch (entityType) {
      case "company":
        return `Projects linked to ${displayName}`;
      case "team":
        return `Projects involving this team`;
      case "person":
        return `Projects associated with ${displayName}`;
      default:
        return "Related projects";
    }
  })();

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="folder-git-2"
      title="Projects"
      subtitle={subtitle}
    >
      <ProjectsTable
        items={orderedProjects}
        sortable={sortable}
        onReorder={onReorder}
        getSortableId={(project) => project.file!.path}
      />
    </Card>
  );
};

const getDisplayName = (file: TCachedFile) => {
  const fm = file.cache?.frontmatter as Record<string, unknown> | undefined;
  const show = fm?.show;
  if (typeof show === "string" && show.trim()) return show.trim();
  const name = fm?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return file.file?.basename ?? "";
};

const normalizeRef = (raw: string): string | null => {
  let value = raw.trim();
  if (!value) return null;
  if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
  }
  value = value.split("|")[0].split("#")[0].trim();
  if (!value) return null;
  return value.replace(/\\/g, "/").replace(/\.md$/i, "");
};

const expandRefVariants = (ref: string, app: App, sourcePath: string) => {
  const variants = new Set<string>();

  variants.add(ref);

  const lastSegment = ref.split("/").pop();
  if (lastSegment) variants.add(lastSegment);

  const dest = app.metadataCache.getFirstLinkpathDest(ref, sourcePath) as
    | (TFile & { path: string; basename: string })
    | null
    | undefined;

  if (dest) {
    variants.add(dest.basename);
    variants.add(dest.path.replace(/\.md$/i, ""));
  }

  return variants;
};
