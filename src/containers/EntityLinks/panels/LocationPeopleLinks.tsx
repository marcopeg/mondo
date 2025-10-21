import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import PeopleTable from "@/components/PeopleTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type LocationPeopleLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const LocationPeopleLinks = ({
  file,
  config,
}: LocationPeopleLinksProps) => {
  const people = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (candidate: TCachedFile, _app: App) => {
        if (!file.file) return false;
        return matchesPropertyLink(candidate, "location", file.file);
      },
      [file.file]
    ),
  });

  if (people.length === 0) {
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
      icon="users"
      title="People"
    >
      <PeopleTable items={people} />
    </Card>
  );
};
