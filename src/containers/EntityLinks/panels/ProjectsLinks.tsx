import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ProjectsTable from "@/components/ProjectsTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";
import { getProjectDisplayLabel } from "@/utils/getProjectDisplayInfo";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { addParticipantLink } from "@/utils/participants";

type ProjectsLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

// Focuses the title element (inline title or input) and selects all its content
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;

  // 1) Try inline title (contenteditable element)
  const inlineTitleEl: HTMLElement | null =
    view?.contentEl?.querySelector?.(".inline-title") ??
    view?.containerEl?.querySelector?.(".inline-title") ??
    null;
  if (inlineTitleEl) {
    inlineTitleEl.focus();
    try {
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(inlineTitleEl);
        selection.addRange(range);
      }
    } catch (_) {
      // no-op if selection APIs are unavailable
    }
    return true;
  }

  // 2) Try title input (when inline title is configured as an input)
  const titleInput: HTMLInputElement | undefined =
    view?.fileView?.inputEl ?? view?.titleEl?.querySelector?.("input");
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
    return true;
  }

  return false;
};

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "untitled";

export const ProjectsLinks = ({ file, config }: ProjectsLinksProps) => {
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);

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

  const collapsed = (config as any)?.collapsed !== false;

  const hasProjects = orderedProjects.length > 0;

  const handleCreateProject = useCallback(async () => {
    if (isCreating || !file.file) {
      return;
    }

    setIsCreating(true);

    try {
      // Get plugin settings for root paths and templates
      const pluginInstance = (app as any).plugins?.plugins?.["crm"] as
        | {
            settings?: {
              rootPaths?: Partial<Record<CRMFileType, string>>;
              templates?: Partial<Record<CRMFileType, string>>;
            };
          }
        | undefined;

      if (!pluginInstance?.settings) {
        throw new Error("CRM plugin settings are not available.");
      }

      const settings = pluginInstance.settings;
      const folderSetting = settings.rootPaths?.[CRMFileType.PROJECT] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);

      // Ensure folder exists
      if (normalizedFolder) {
        const existingFolder =
          app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await app.vault.createFolder(normalizedFolder);
        }
      }

      // Create file path
      const safeBase = sanitizeFileName("Untitled Project");
      const fileName = `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;

      let projectFile = app.vault.getAbstractFileByPath(
        filePath
      ) as TFile | null;

      if (!projectFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.PROJECT
        );

        const content = renderTemplate(templateSource, {
          title: "Untitled Project",
          type: String(CRMFileType.PROJECT),
          filename: fileName,
          slug: "untitled-project",
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        projectFile = await app.vault.create(filePath, content);
      }

      // Add participant link to the project
      if (projectFile) {
        const linkTarget = app.metadataCache.fileToLinktext(
          file.file,
          projectFile.path
        );
        const link = `[[${linkTarget}]]`;
        await addParticipantLink(app, projectFile, link);
      }

      // Open the project file
      const leaf = app.workspace.getLeaf(false);
      if (leaf && projectFile) {
        await (leaf as any).openFile(projectFile);

        // Focus and select title
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === projectFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("ProjectsLinks: failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, file, isCreating]);

  const actions = [
    {
      key: "project-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create project"
          onClick={handleCreateProject}
        />
      ),
    },
  ];

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="folder-git-2"
      title="Projects"
      actions={actions}
      {...(!hasProjects ? { p: 0 } : {})}
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
