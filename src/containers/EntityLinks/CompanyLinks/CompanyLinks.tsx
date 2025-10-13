import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import { Card } from "@/components/ui/Card";
import { useCallback } from "react";
import PeopleTable from "@/components/PeopleTable";
import MeetingsTable from "@/components/MeetingsTable";
import TeamsTable from "@/components/TeamsTable";
import ProjectsTable from "@/components/ProjectsTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const CompanyLinks = () => {
  const { file } = useEntityFile();

  const personList = useFiles(CRMFileType.PERSON, {
    filter: useCallback(
      (personCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(personCached, "company", file.file);
      },
      [file]
    ),
  });

  // find teams linked to the current file
  const teamsList = useFiles(CRMFileType.TEAM, {
    filter: useCallback(
      (teamCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        // reuse matchesPropertyLink to check for links to the current file in team files
        return matchesPropertyLink(teamCached, "company", file.file);
      },
      [file]
    ),
  });

  // find projects linked to the current company
  const projectsList = useFiles(CRMFileType.PROJECT, {
    filter: useCallback(
      (projectCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(projectCached, "company", file.file);
      },
      [file]
    ),
  });

  // find meetings where this company/file is referenced in participants
  const meetingsList = useFiles(CRMFileType.MEETING, {
    filter: useCallback(
      (meetingCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(meetingCached, "participants", file.file);
      },
      [file]
    ),
  });

  // console.log("teamsList:", teamsList);
  // console.log(personList);

  return (
    <>
      <Card
        icon={"users"}
        title="Teams"
        subtitle="Teams linked to this company"
        mt={4}
        p={0}
      >
        <TeamsTable items={teamsList} />
      </Card>
      <Card
        icon={"briefcase"}
        title="Projects"
        subtitle="Projects involving this company"
        mt={4}
        p={0}
      >
        <ProjectsTable items={projectsList} />
      </Card>
      <Card
        icon={"user"}
        title="People"
        subtitle="Linked directly, or through a Team"
        mt={4}
        p={0}
      >
        <PeopleTable items={personList} />
      </Card>
      <Card
        icon={"calendar"}
        title="Meetings"
        subtitle="Meetings referencing this company"
        mt={4}
        p={0}
      >
        <MeetingsTable items={meetingsList} />
      </Card>
    </>
  );
};
export default CompanyLinks;
