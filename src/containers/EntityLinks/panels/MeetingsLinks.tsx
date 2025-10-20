import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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
  const hostFile = file.file;

  const meetings = useFiles(CRMFileType.MEETING, {
    filter: useCallback(
      (meetingCached: TCachedFile, _app: App) => {
        if (!file.file || !entityType) return false;

        switch (entityType) {
          case "person":
            return matchesPropertyLink(
              meetingCached,
              "participants",
              file.file
            );
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
    (file.cache?.frontmatter?.show as string | undefined) ?? file.file.basename;

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

  const actions =
    linkTargets.length > 0
      ? [
          {
            key: "meeting-create",
            content: (
              <Button
                variant="link"
                icon="plus"
                aria-label="Create meeting"
                onClick={handleAddMeeting}
                disabled={!file?.file}
              />
            ),
          },
        ]
      : [];

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.meetings?.collapsed === true) return true;
    if (crmState?.meetings?.collapsed === false) return false;
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;

      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof frontmatter.crmState !== "object" ||
            frontmatter.crmState === null
          ) {
            frontmatter.crmState = {};
          }

          if (
            typeof frontmatter.crmState.meetings !== "object" ||
            frontmatter.crmState.meetings === null
          ) {
            frontmatter.crmState.meetings = {};
          }

          frontmatter.crmState.meetings.collapsed = isCollapsed;
        });
      } catch (error) {
        console.error("MeetingsLinks: failed to persist collapse state", error);
      }
    },
    [app, hostFile]
  );

  const noPaddingWhenEmpty = useMemo(() => {
    // For projects, keep the default padding even when empty to match Facts appearance
    if (entityType === "project") return false;
    return meetings.length === 0;
  }, [entityType, meetings.length]);

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="calendar"
      title="Meetings"
      actions={actions}
      onCollapseChange={handleCollapseChange}
      {...(noPaddingWhenEmpty ? { p: 0 } : {})}
    >
      <MeetingsTable items={meetings} emptyLabel="No meetings yet" />
    </Card>
  );
};
