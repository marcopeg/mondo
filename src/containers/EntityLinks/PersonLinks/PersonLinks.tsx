import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";
import { useEntityFile } from "@/context/EntityFileProvider";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/hooks/use-app";
import { useCallback } from "react";
import MeetingsTable from "@/components/MeetingsTable";
import PeopleTable from "@/components/PeopleTable";
import { matchesPropertyLink } from "@/utils/matchesPropertyLink";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import type { TCachedFile } from "@/types/TCachedFile";
import type { App, TFile } from "obsidian";

export const PersonLinks = () => {
  const { file } = useEntityFile();
  const app = useApp();

  const handleAddMeetingAction = useCallback(() => {
    if (!file?.file) {
      console.warn("PersonLinks: no active person file found.");
      return;
    }

    const pluginInstance = (app as any).plugins?.plugins?.["crm"] as {
      settings?: Record<string, unknown>;
      saveSettings?: () => Promise<void>;
    } | undefined;

    if (!pluginInstance?.settings) {
      console.error("PersonLinks: CRM plugin instance not available.");
      return;
    }

    const settings = pluginInstance.settings as {
      rootPaths?: Partial<Record<CRMFileType, string>>;
      templates?: Partial<Record<CRMFileType, string>>;
    };

    const getDisplayName = () => {
      const fm = file.cache?.frontmatter as
        | Record<string, unknown>
        | undefined;
      const show = fm?.show;
      if (typeof show === "string" && show.trim().length > 0) {
        return show.trim();
      }
      const title = fm?.title;
      if (typeof title === "string" && title.trim().length > 0) {
        return title.trim();
      }
      return file.file.basename;
    };

    const slugify = (value: string): string =>
      value
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    void (async () => {
      try {
        const displayName = getDisplayName();
        const rootPathSetting =
          settings.rootPaths?.[CRMFileType.MEETING] ?? "/";
        const normalizedFolder =
          rootPathSetting === "/"
            ? ""
            : rootPathSetting.replace(/^\/+/, "").replace(/\/+$/, "");

        if (normalizedFolder !== "") {
          const existingFolder =
            app.vault.getAbstractFileByPath(normalizedFolder);
          if (!existingFolder) {
            await app.vault.createFolder(normalizedFolder);
          }
        }

        const now = new Date();
        const isoTimestamp = now.toISOString();
        const dateStamp = isoTimestamp.split("T")[0];
        const title = `${dateStamp} - ${displayName}`;
        const safeTitle = title.trim() || dateStamp;
        const slug = slugify(safeTitle);
        const safeFileBase = safeTitle.replace(/[\\/|?*:<>"]/g, "-");
        const fileName = safeFileBase.endsWith(".md")
          ? safeFileBase
          : `${safeFileBase}.md`;
        const filePath = normalizedFolder
          ? `${normalizedFolder}/${fileName}`
          : fileName;

        let meetingFile = app.vault.getAbstractFileByPath(filePath) as
          | TFile
          | null;

        if (!meetingFile) {
          const templateSource = getTemplateForType(
            settings.templates,
            CRMFileType.MEETING
          );

          const formattedTime = isoTimestamp.slice(11, 16);

          let content = renderTemplate(templateSource, {
            title: safeTitle,
            type: String(CRMFileType.MEETING),
            filename: fileName,
            slug,
            date: dateStamp,
            time: formattedTime,
            datetime: isoTimestamp,
          });

          const linkTarget = app.metadataCache.fileToLinktext(
            file.file,
            filePath
          );
          const participantLink = `  - "[[${linkTarget}|${displayName}]]"`;

          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const frontmatterBody = frontmatterMatch[1];
            const fmLines = frontmatterBody.split("\n");
            const participantsIndex = fmLines.findIndex(
              (line) => line.trim().toLowerCase() === "participants:"
            );

            if (participantsIndex !== -1) {
              fmLines.splice(participantsIndex + 1, 0, participantLink);
            } else {
              fmLines.push("participants:");
              fmLines.push(participantLink);
            }

            const updatedFrontmatter = fmLines.join("\n");
            content = content.replace(
              frontmatterMatch[0],
              `---\n${updatedFrontmatter}\n---`
            );
          } else {
            content = [
              "---",
              `type: ${CRMFileType.MEETING}`,
              `show: ${JSON.stringify(safeTitle)}`,
              "participants:",
              participantLink,
              "---",
              content,
            ].join("\n");
          }

          meetingFile = await app.vault.create(filePath, content);
        }

        if (meetingFile) {
          const leaf = app.workspace.getLeaf(true);
          if (leaf) {
            await (leaf as any).openFile(meetingFile);
          }
        }
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
        actions={[
          {
            icon: "plus",
            onClick: handleAddMeetingAction,
          },
        ]}
      >
        <MeetingsTable items={meetingsList} />
      </Card>
    </>
  );
};

export default PersonLinks;
