import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import MeetingsTable from "@/components/MeetingsTable";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";
import { useApp } from "@/hooks/use-app";
import {
  createMeetingForEntity,
  type MeetingLinkTarget,
} from "@/utils/createMeetingForPerson";

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
          case "location":
            return matchesPropertyLink(meetingCached, "location", file.file);
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
      case "location":
        return "Meetings at this location";
      default:
        return "Meetings";
    }
  })();

  const linkTargets = useMemo<MeetingLinkTarget[]>(() => {
    if (!file?.file || !entityType) {
      return [];
    }

    switch (entityType) {
      case "person":
        return [
          {
            property: "participants",
            mode: "list",
            target: file,
          },
        ];
      case "team":
        return [
          {
            property: "team",
            mode: "single",
            target: file,
          },
        ];
      case "project":
        return [
          {
            property: "project",
            mode: "single",
            target: file,
          },
        ];
      case "location":
        return [
          {
            property: "location",
            mode: "single",
            target: file,
          },
        ];
      default:
        return [];
    }
  }, [entityType, file]);

  const handleAddMeeting = useCallback(() => {
    if (!file?.file) {
      console.warn("MeetingsLinks: missing focused entity file.");
      return;
    }

    if (linkTargets.length === 0) {
      console.warn(
        `MeetingsLinks: unsupported entity type for meeting creation: ${entityType}`
      );
      return;
    }

    void (async () => {
      try {
        await createMeetingForEntity({
          app,
          entityFile: file,
          linkTargets,
        });
      } catch (error) {
        console.error("MeetingsLinks: failed to create meeting", error);
      }
    })();
  }, [app, entityType, file, linkTargets]);

  const actions = linkTargets.length > 0
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
