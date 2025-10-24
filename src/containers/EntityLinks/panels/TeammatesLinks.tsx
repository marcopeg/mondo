import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";

type TeammatesLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

// Focus and select note title for quick rename
const focusAndSelectTitle = (leaf: any) => {
  const view = leaf?.view as any;
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
    } catch {}
    return true;
  }
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

export const TeammatesLinks = ({ file, config }: TeammatesLinksProps) => {
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);
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
        value = value
          .split("|")[0]
          .split("#")[0]
          .replace(/\\.md$/i, "")
          .trim();
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

  // Hide the panel if the current person has no team property, or it is null/empty
  if (!teamsInfo.hasTeams) {
    return null;
  }

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.teammates?.collapsed === true) return true;
    if (crmState?.teammates?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!file.file) return;
      try {
        await app.fileManager.processFrontMatter(file.file, (frontmatter) => {
          if (
            typeof (frontmatter as any).crmState !== "object" ||
            (frontmatter as any).crmState === null
          ) {
            (frontmatter as any).crmState = {};
          }
          if (
            typeof (frontmatter as any).crmState.teammates !== "object" ||
            (frontmatter as any).crmState.teammates === null
          ) {
            (frontmatter as any).crmState.teammates = {};
          }
          (frontmatter as any).crmState.teammates.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "TeammatesLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, file.file]
  );

  const handleCreateTeammate = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const hostFile = file.file;
      if (!hostFile) return;

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
      const folderSetting = settings.rootPaths?.[CRMFileType.PERSON] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);

      if (normalizedFolder) {
        const existingFolder =
          app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await app.vault.createFolder(normalizedFolder);
        }
      }

      const safeBase = sanitizeFileName("Untitled Person");
      const fileName = `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;

      let personFile = app.vault.getAbstractFileByPath(
        filePath
      ) as TFile | null;
      if (!personFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.PERSON
        );

        const content = renderTemplate(templateSource, {
          title: "Untitled Person",
          type: String(CRMFileType.PERSON),
          filename: fileName,
          slug: "untitled-person",
          date: isoTimestamp,
        });

        personFile = await app.vault.create(filePath, content);
      }

      if (personFile) {
        // If current person has team references, set them on the new person
        if (teamsInfo.teams.length > 0) {
          const links: string[] = [];
          for (const ref of teamsInfo.teams) {
            const dest = app.metadataCache.getFirstLinkpathDest(
              ref,
              personFile.path
            ) as TFile | null | undefined;
            if (dest) {
              const linktext = app.metadataCache.fileToLinktext(
                dest,
                personFile.path
              );
              links.push(`[[${linktext}]]`);
            } else {
              // fallback to raw ref
              links.push(`[[${ref}]]`);
            }
          }

          await app.fileManager.processFrontMatter(personFile, (fm) => {
            if (links.length === 1) {
              (fm as any).team = links[0];
              delete (fm as any).teams;
            } else if (links.length > 1) {
              (fm as any).teams = links;
              delete (fm as any).team;
            }
          });
        }

        const leaf = app.workspace.getLeaf(false);
        await (leaf as any).openFile(personFile);

        // Focus and select title for quick rename
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === personFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("TeammatesLinks: failed to create teammate", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, file.file, isCreating, teamsInfo.teams]);

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="users"
      title="Teammates"
      actions={[
        {
          key: "teammate-create",
          content: (
            <Button
              variant="link"
              icon="plus"
              aria-label="Create person"
              onClick={handleCreateTeammate}
            />
          ),
        },
      ]}
      onCollapseChange={handleCollapseChange}
    >
      <PeopleTable items={teammates} />
    </Card>
  );
};
