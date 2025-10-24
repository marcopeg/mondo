import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

type EmployeesLinksProps = {
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

export const EmployeesLinks = ({ file, config }: EmployeesLinksProps) => {
  const app = useApp();
  const [isCreating, setIsCreating] = useState(false);

  const employees = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "company", file.file);
      },
      [file.file]
    ),
  });

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const showA =
        (a.cache?.frontmatter?.show as string) ?? a.file?.basename ?? "";
      const showB =
        (b.cache?.frontmatter?.show as string) ?? b.file?.basename ?? "";
      return showA.localeCompare(showB);
    });
  }, [employees]);

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.employees?.collapsed === true) return true;
    if (crmState?.employees?.collapsed === false) return false;
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
            typeof (frontmatter as any).crmState.employees !== "object" ||
            (frontmatter as any).crmState.employees === null
          ) {
            (frontmatter as any).crmState.employees = {};
          }
          (frontmatter as any).crmState.employees.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "EmployeesLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, file]
  );

  const handleCreatePerson = useCallback(async () => {
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
        // Set 'company' property to link back to the current company
        const companyLinktext = app.metadataCache.fileToLinktext(
          file.file,
          personFile.path
        );
        await app.fileManager.processFrontMatter(personFile, (fm) => {
          (fm as any).company = `[[${companyLinktext}]]`;
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
      console.error("EmployeesLinks: failed to create person", error);
    } finally {
      setIsCreating(false);
    }
  }, [app, file, isCreating]);

  if (employees.length === 0) {
    return (
      <button
        type="button"
        className="hidden"
        aria-label="Create person"
        onClick={handleCreatePerson}
      />
    );
  }

  const actions = [
    {
      key: "employee-create",
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
      icon="user"
      title="Employees"
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <PeopleTable items={sortedEmployees} />
    </Card>
  );
};
