import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/hooks/use-app";
import { useCallback } from "react";
import MeetingsTable from "@/components/MeetingsTable";
import PeopleTable from "@/components/PeopleTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { createMeetingForPerson } from "@/utils/createMeetingForPerson";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App } from "obsidian";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export const PersonLinks = () => {
  const { file } = useEntityFile();
  const app = useApp();

  const handleAddMeetingAction = useCallback(() => {
    if (!file?.file) {
      console.warn("PersonLinks: no active person file found.");
      return;
    }

    void (async () => {
      try {
        await createMeetingForPerson({ app, personFile: file });
      } catch (error) {
        console.error("PersonLinks: failed to create meeting", error);
      }
    })();
  }, [app, file]);

  const meetingsList = useFiles(CRMFileType.MEETING, {
    filter: useCallback(
      (meetingCached: TCachedFile, _app: App) => {
        if (!file?.file) return false;
        return matchesPropertyLink(meetingCached, "participants", file.file);
      },
      [file]
    ),
  });

  // compute teammates: people who share at least one team with the current person
  const teammates = useFiles(CRMFileType.PERSON, {
    // fetch all people then filter in-memory using their frontmatter teams
    filter: useCallback(
      (p: TCachedFile, app: App) => {
        try {
          const fm = file?.cache?.frontmatter as
            | Record<string, unknown>
            | undefined;
          if (!fm) return false;

          // current person's teams can be under 'team' or 'teams'
          const rawTeams = fm.team ?? fm.teams;
          if (!rawTeams) return false;

          const myTeams: string[] = Array.isArray(rawTeams)
            ? rawTeams.map((v) => String(v))
            : [String(rawTeams)];

          const normalizeRef = (raw: string) => {
            let s = raw.trim();
            if (s.startsWith("[[") && s.endsWith("]]")) s = s.slice(2, -2);
            s = s.split("|")[0].split("#")[0].replace(/\.md$/i, "").trim();
            return s;
          };

          const myTeamSet = new Set(
            myTeams.map((t) => normalizeRef(String(t)))
          );

          // get candidate person's teams
          const candFm = p.cache?.frontmatter as
            | Record<string, unknown>
            | undefined;
          if (!candFm) return false;
          const candRaw = candFm.team ?? candFm.teams;
          if (!candRaw) return false;
          const candTeams: string[] = Array.isArray(candRaw)
            ? candRaw.map((v) => String(v))
            : [String(candRaw)];

          // normalize and check overlap. we also resolve wikilinks to their path/basename
          for (const ct of candTeams) {
            const n = normalizeRef(ct);
            if (myTeamSet.has(n)) return true;

            // try resolve via metadataCache to compare absolute paths
            const dest = app.metadataCache.getFirstLinkpathDest(
              n,
              p.file.path
            ) as any;
            if (dest && dest.path) {
              if (myTeamSet.has(dest.path.replace(/\.md$/i, ""))) return true;
              if (myTeamSet.has((dest as any).basename)) return true;
            }
          }

          return false;
        } catch (e) {
          return false;
        }
      },
      [file]
    ),
  });

  // determine whether the current person has any team(s) declared in frontmatter
  const hasTeams = (() => {
    try {
      const fm = file?.cache?.frontmatter as
        | Record<string, unknown>
        | undefined;
      if (!fm) return false;
      const raw = fm.team ?? fm.teams;
      if (raw == null) return false;
      if (Array.isArray(raw)) {
        // consider array with only empty strings as empty
        return raw.map((v) => String(v).trim()).filter(Boolean).length > 0;
      }
      return String(raw).trim().length > 0;
    } catch (e) {
      return false;
    }
  })();

  const meetingCount = meetingsList.length;
  const meetingActions = [
    {
      key: "meeting-count",
      content: (
        <Badge
          aria-label={`${meetingCount} meeting${meetingCount === 1 ? "" : "s"}`}
        >
          {meetingCount}
        </Badge>
      ),
    },
    {
      key: "meeting-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          onClick={handleAddMeetingAction}
          disabled={!file?.file}
        >
          + New Meeting
        </Button>
      ),
    },
  ];

  return (
    <>
      {hasTeams && (
        <Card
          icon={"users"}
          title="Teammates"
          subtitle="People who share a team with this person"
          mt={4}
          p={0}
        >
          <PeopleTable items={teammates} />
        </Card>
      )}
      <Card
        icon={"calendar"}
        title="Meetings"
        mt={4}
        p={0}
        actions={meetingActions}
      >
        <MeetingsTable items={meetingsList} />
      </Card>
    </>
  );
};

export default PersonLinks;
