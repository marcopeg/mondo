import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import { Card } from "@/components/ui/Card";
import { useCallback } from "react";
import MeetingsTable from "@/components/MeetingsTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

export const ProjectLinks = () => {
  const { file } = useEntityFile();

  const meetingsList = useFiles(CRMFileType.MEETING, {
    filter: useCallback(
      (meetingCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(meetingCached, "project", file.file);
      },
      [file]
    ),
  });

  return (
    <>
      <Card
        icon={"calendar"}
        title="Meetings"
        subtitle="Meetings referencing this project"
        mt={4}
        p={0}
      >
        <MeetingsTable items={meetingsList} />
      </Card>
    </>
  );
};

export default ProjectLinks;
