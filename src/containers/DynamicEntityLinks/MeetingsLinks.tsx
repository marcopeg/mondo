import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import MeetingsTable from "@/components/MeetingsTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { createMeetingForPerson } from "@/utils/createMeetingForPerson";

type MeetingsLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const MeetingsLinks = ({ file, config }: MeetingsLinksProps) => {
  const app = useApp();
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

  const handleAddMeeting = useCallback(() => {
    if (entityType !== "person") {
      return;
    }

    if (!file?.file) {
      console.warn("MeetingsLinks: missing focused person file.");
      return;
    }

    void (async () => {
      try {
        await createMeetingForPerson({ app, personFile: file });
      } catch (error) {
        console.error("MeetingsLinks: failed to create meeting", error);
      }
    })();
  }, [app, entityType, file]);

  const actions = entityType === "person"
    ? [
        {
          icon: "plus",
          onClick: handleAddMeeting,
        },
      ]
    : undefined;

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="calendar"
      title="Meetings"
      subtitle={subtitle}
      actions={actions}
    >
      {meetings.length > 0 ? (
        <MeetingsTable items={meetings} />
      ) : (
        <p style={{ color: "var(--text-muted)" }}>No meetings yet.</p>
      )}
    </Card>
  );
};
