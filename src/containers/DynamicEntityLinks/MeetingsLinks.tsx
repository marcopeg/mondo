import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import MeetingsTable from "@/components/MeetingsTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";

type MeetingsLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const MeetingsLinks = ({ file, config }: MeetingsLinksProps) => {
  const entityType = file.cache?.frontmatter?.type as string | undefined;

  const meetings = useFiles(CRMFileType.MEETING, {
    filter: useCallback(
      (meetingCached: TCachedFile, _app: App) => {
        if (!file.file || !entityType) return false;

        switch (entityType) {
          case "person":
            return matchesPropertyLink(meetingCached, "participants", file.file);
          case "team":
            return (
              matchesPropertyLink(meetingCached, "team", file.file) ||
              matchesPropertyLink(meetingCached, "teams", file.file)
            );
          case "project":
            return matchesPropertyLink(meetingCached, "project", file.file);
          default:
            return false;
        }
      },
      [entityType, file.file]
    ),
  });

  if (meetings.length === 0) {
    return null;
  }

  const displayName =
    (file.cache?.frontmatter?.show as string | undefined) ??
    file.file.basename;

  const subtitle = (() => {
    switch (entityType) {
      case "person":
        return `Meetings referencing ${displayName}`;
      case "team":
        return "Meetings involving this team";
      case "project":
        return "Meetings associated with this project";
      default:
        return "Meetings";
    }
  })();

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="calendar"
      title="Meetings"
      subtitle={subtitle}
    >
      <MeetingsTable items={meetings} />
    </Card>
  );
};
