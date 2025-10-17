import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type EmployeesLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const EmployeesLinks = ({ file, config }: EmployeesLinksProps) => {
  const employees = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "company", file.file);
      },
      [file.file]
    ),
  });

  if (employees.length === 0) {
    return null;
  }

  const companyName =
    (file.cache?.frontmatter?.show as string | undefined) ??
    (file.cache?.frontmatter?.name as string | undefined) ??
    file.file.basename;

  const collapsed = (config as any)?.collapsed !== false;

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="user"
      title="Employees"
      subtitle={`People employed at ${companyName}`}
    >
      <PeopleTable items={employees} />
    </Card>
  );
};
