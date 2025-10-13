import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import PeopleTable from "@/components/PeopleTable";
import ProjectsTable from "@/components/ProjectsTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const TeamLinks = () => {
  const { file } = useEntityFile();

  const peopleList = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (personCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        // people link to teams via the `teams` frontmatter property
        return matchesPropertyLink(personCached, "team", file.file);
      },
      [file]
    ),
  });
  const projectsList = useFiles(CRMFileType.PROJECT, {
    filter: useCallback(
      (projectCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        // projects may reference teams via a `teams` frontmatter property
        return matchesPropertyLink(projectCached, "team", file.file);
      },
      [file]
    ),
  });

  return (
    <>
      <Card
        icon={"user"}
        title="People"
        subtitle="Members of this team"
        mt={4}
        p={0}
      >
        <PeopleTable items={peopleList} />
      </Card>
      <Card
        icon={"briefcase"}
        title="Projects"
        subtitle="Projects involving this team"
        mt={4}
        p={0}
      >
        <ProjectsTable items={projectsList} />
      </Card>
    </>
  );
};
