import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

type TeamMembersLinksProps = {
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

export const TeamMembersLinks = ({ file, config }: TeamMembersLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const [isCreating, setIsCreating] = useState(false);

  const members = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, appContext: App) => {
        if (!hostFile) return false;
        return matchesTeam(candidate, hostFile.path, appContext);
      },
      [hostFile]
    ),
  });

  const sortedMembers = useMemo(() => {
    return members
      .filter((member) => Boolean(member.file))
      .sort((a, b) => {
        const showA =
          (a.cache?.frontmatter?.show as string) ?? a.file?.basename ?? "";
        const showB =
          (b.cache?.frontmatter?.show as string) ?? b.file?.basename ?? "";
        return showA.localeCompare(showB);
      });
  }, [members]);

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.teamMembers?.collapsed === true) return true;
    if (crmState?.teamMembers?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;

      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {} as any;
          }

          if (typeof frontmatter.crmState.teamMembers !== "object") {
            frontmatter.crmState.teamMembers = {};
          }

          frontmatter.crmState.teamMembers.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "TeamMembersLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, hostFile]
  );

  const handleCreatePerson = useCallback(async () => {
    if (isCreating || !hostFile) {
      return;
    }

    setIsCreating(true);

    try {
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
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        personFile = await app.vault.create(filePath, content);
      }

      if (personFile) {
        const teamLinktext = app.metadataCache.fileToLinktext(
          hostFile,
          personFile.path
        );
        await app.fileManager.processFrontMatter(personFile, (fm) => {
          (fm as any).team = `[[${teamLinktext}]]`;
        });
      }

      const leaf = app.workspace.getLeaf(false);
      if (leaf && personFile) {
        await (leaf as any).openFile(personFile);
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === personFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("TeamMembersLinks: failed to create person", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, hostFile, isCreating]);

  if (!hostFile) {
    return null;
  }

  const title = file.cache?.frontmatter?.show ?? hostFile.basename;

  const actions = [
    {
      key: "team-member-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create person"
          onClick={handleCreatePerson}
        />
      ),
    },
  ];

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="users"
      title="Members"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <PeopleTable items={sortedMembers} />
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
