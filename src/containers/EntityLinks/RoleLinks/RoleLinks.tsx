import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import PeopleTable from "@/components/PeopleTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const RoleLinks = () => {
  const { file } = useEntityFile();

  const peopleList = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (personCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        // people link to roles via the `role` frontmatter property
        return matchesPropertyLink(personCached, "role", file.file);
      },
      [file]
    ),
  });

  return (
    <Card
      icon={"user"}
      title="People"
      subtitle="People with this role"
      mt={4}
      p={0}
    >
      <PeopleTable items={peopleList} />
    </Card>
  );
};
