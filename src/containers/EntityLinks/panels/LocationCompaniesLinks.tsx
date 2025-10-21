import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import CompaniesTable from "@/components/CompaniesTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type LocationCompaniesLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const LocationCompaniesLinks = ({
  file,
  config,
}: LocationCompaniesLinksProps) => {
  const companies = useFiles(CRMFileType.COMPANY, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "location", file.file);
      },
      [file.file]
    ),
  });

  if (companies.length === 0) {
    return null;
  }

  const locationName =
    (file.cache?.frontmatter?.show as string | undefined) ??
    (file.cache?.frontmatter?.name as string | undefined) ??
    file.file.basename;

  return (
    <Card
      collapsible
      collapsed={(config as any)?.collapsed !== false}
      icon="building-2"
      title="Companies"
    >
      <CompaniesTable items={companies} />
    </Card>
  );
};
