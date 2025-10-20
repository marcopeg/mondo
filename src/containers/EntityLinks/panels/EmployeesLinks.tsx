import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type EmployeesLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const EmployeesLinks = ({ file, config }: EmployeesLinksProps) => {
  const app = useApp();

  const employees = useFiles(CRMFileType.PERSON, {
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

  if (employees.length === 0) {
    return null;
  }

  const companyName =
    (file.cache?.frontmatter?.show as string | undefined) ??
    (file.cache?.frontmatter?.name as string | undefined) ??
    file.file.basename;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="user"
      title="Employees"
      subtitle={`People employed at ${companyName}`}
      onCollapseChange={handleCollapseChange}
    >
      <PeopleTable items={employees} />
    </Card>
  );
};
