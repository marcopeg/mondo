import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import TeamsTable from "@/components/TeamsTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

type TeamsLinksProps = {
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

export const TeamsLinks = ({ file, config }: TeamsLinksProps) => {
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);

  const teams = useFiles(CRMFileType.TEAM, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "company", file.file);
      },
      [file.file]
    ),
  });

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.teams?.collapsed === true) return true;
    if (crmState?.teams?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!file.file) return;

      try {
        await app.fileManager.processFrontMatter(file.file, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {} as any;
          }
          if (
            typeof (frontmatter as any).crmState.teams !== "object" ||
            (frontmatter as any).crmState.teams === null
          ) {
            (frontmatter as any).crmState.teams = {};
          }
          (frontmatter as any).crmState.teams.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error("TeamsLinks: failed to persist collapse state", error);
      }
    },
    [app, file]
  );

  const handleCreateTeam = useCallback(async () => {
    if (isCreating || !file.file) {
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
      const folderSetting = settings.rootPaths?.[CRMFileType.TEAM] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);

      if (normalizedFolder) {
        const existingFolder =
          app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await app.vault.createFolder(normalizedFolder);
        }
      }

      const safeBase = sanitizeFileName("Untitled Team");
      const fileName = `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;

      let teamFile = app.vault.getAbstractFileByPath(filePath) as TFile | null;

      if (!teamFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.TEAM
        );

        const content = renderTemplate(templateSource, {
          title: "Untitled Team",
          type: String(CRMFileType.TEAM),
          filename: fileName,
          slug: "untitled-team",
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        teamFile = await app.vault.create(filePath, content);
      }

      if (teamFile) {
        // Set 'company' property to link back to the current company
        const companyLinktext = app.metadataCache.fileToLinktext(
          file.file,
          teamFile.path
        );
        await app.fileManager.processFrontMatter(teamFile, (fm) => {
          (fm as any).company = `[[${companyLinktext}]]`;
        });
      }

      const leaf = app.workspace.getLeaf(false);
      if (leaf && teamFile) {
        await (leaf as any).openFile(teamFile);
        window.setTimeout(() => {
          if (app.workspace.getActiveFile()?.path === teamFile!.path) {
            focusAndSelectTitle(leaf);
          }
        }, 150);
      }
    } catch (error) {
      console.error("TeamsLinks: failed to create team", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, file, isCreating]);

  if (teams.length === 0) {
    return null;
  }

  const actions = [
    {
      key: "team-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create team"
          onClick={handleCreateTeam}
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
      title="Teams"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <TeamsTable items={teams} />
    </Card>
  );
};
