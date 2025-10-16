import { useCallback, useMemo, useState } from "react";
import { AutoComplete } from "@/components/AutoComplete";
import { InlineError } from "@/components/InlineError";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import { useApp } from "@/hooks/use-app";
import { useFiles } from "@/hooks/use-files";
import { useSetting } from "@/hooks/use-setting";
import { CRMFileType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import type { TFile } from "obsidian";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import {
  addParticipantLink,
  normalizeParticipantLink,
  parseParticipants,
} from "@/utils/participants";
import { resolveSelfPerson } from "@/utils/selfPerson";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

type ParticipantsAssignmentLinksProps = {
  config: Record<string, unknown>;
  file: TCachedFile;
};

export const ParticipantsAssignmentLinks = ({
  file,
  config,
}: ParticipantsAssignmentLinksProps) => {
  const app = useApp();
  const selfPersonPath = useSetting<string>("selfPersonPath", "");
  const people = useFiles(CRMFileType.PERSON);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frontmatter = file.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const participants = useMemo(
    () => parseParticipants(frontmatter?.participants),
    [frontmatter?.participants]
  );

  const hasParticipants = participants.length > 0;

  const participantLookup = useMemo(() => {
    const normalized = new Set<string>();
    participants.forEach((entry) => {
      const trimmed = entry.trim();
      if (trimmed) {
        normalized.add(trimmed.toLowerCase());
      }
      const normalizedLink = normalizeParticipantLink(entry);
      if (normalizedLink) {
        normalized.add(normalizedLink.toLowerCase());
      }
    });
    return normalized;
  }, [participants]);

  const availablePersonOptions = useMemo(
    () =>
      people
        .filter((candidate) => {
          const base = candidate.file.basename.toLowerCase();
          const path = candidate.file.path.replace(/\.md$/i, "").toLowerCase();
          return (
            !participantLookup.has(base) && !participantLookup.has(path)
          );
        })
        .map((candidate) => candidate.file.basename),
    [participantLookup, people]
  );

  const persistParticipant = useCallback(
    async (link: string) => {
      if (!file.file) {
        return;
      }

      const normalizedLink = normalizeParticipantLink(link);
      if (!normalizedLink) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const updated = await addParticipantLink(app, file.file, link);
        if (!updated) {
          throw new Error("Unable to add participant");
        }
      } catch (err) {
        console.error("ParticipantsAssignmentLinks: failed to update", err);
        setError("Unable to update participants. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [app, file.file]
  );

  const selfParticipant = useMemo(
    () =>
      file.file
        ? resolveSelfPerson(app, file.file.path, selfPersonPath)
        : null,
    [app, file.file, selfPersonPath]
  );

  const handleAssignMe = useCallback(() => {
    if (isSaving || !selfParticipant) {
      return;
    }
    void persistParticipant(selfParticipant.link);
  }, [isSaving, persistParticipant, selfParticipant]);

  const ensurePersonFile = useCallback(
    async (name: string): Promise<TFile | null> => {
      const pluginInstance = (app as any).plugins?.plugins?.["crm"] as
        | {
            settings?: {
              rootPaths?: Partial<Record<CRMFileType, string>>;
              templates?: Partial<Record<CRMFileType, string>>;
            };
          }
        | undefined;

      if (!pluginInstance?.settings) {
        throw new Error("CRM plugin settings are not available.");
      }

      const settings = pluginInstance.settings;
      const folderSetting = settings.rootPaths?.[CRMFileType.PERSON] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);

      if (normalizedFolder) {
        const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
        if (!existingFolder) {
          await app.vault.createFolder(normalizedFolder);
        }
      }

      const base = (name || "untitled").trim();
      const safeBase = sanitizeFileName(base);
      const fileName = safeBase.endsWith(".md") ? safeBase : `${safeBase}.md`;
      const filePath = normalizedFolder
        ? `${normalizedFolder}/${fileName}`
        : fileName;

      let personFile = app.vault.getAbstractFileByPath(filePath) as
        | TFile
        | null;

      if (!personFile) {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const templateSource = await getTemplateForType(
          app,
          settings.templates,
          CRMFileType.PERSON
        );
        const slug = slugify(base) || safeBase.toLowerCase();
        const content = renderTemplate(templateSource, {
          title: base,
          type: String(CRMFileType.PERSON),
          filename: fileName,
          slug,
          date: isoTimestamp.split("T")[0],
          time: isoTimestamp.slice(11, 16),
          datetime: isoTimestamp,
        });

        personFile = await app.vault.create(filePath, content);
      }

      return personFile;
    },
    [app]
  );

  const handleAssignPerson = useCallback(
    (value: string) => {
      if (isSaving || !file.file) {
        return;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      const existing = people.find(
        (candidate) =>
          candidate.file.basename.toLowerCase() === trimmed.toLowerCase()
      );

      const assignExisting = async (targetFile: TFile, display?: string) => {
        const linkTarget = app.metadataCache.fileToLinktext(
          targetFile,
          file.file!.path
        );
        const alias = display?.trim();
        const link =
          alias && alias !== linkTarget
            ? `[[${linkTarget}|${alias}]]`
            : `[[${linkTarget}]]`;
        await persistParticipant(link);
      };

      if (existing?.file) {
        const displayName = getEntityDisplayName(existing);
        void assignExisting(existing.file, displayName);
        return;
      }

      void (async () => {
        try {
          const created = await ensurePersonFile(trimmed);
          if (!created) {
            throw new Error("Person file could not be created.");
          }
          await assignExisting(created, trimmed);
        } catch (err) {
          console.error(
            "ParticipantsAssignmentLinks: failed to create person",
            err
          );
          setError("Unable to assign this person. Please try again.");
        }
      })();
    },
    [
      app.metadataCache,
      ensurePersonFile,
      file.file,
      isSaving,
      people,
      persistParticipant,
    ]
  );

  if (!file.file) {
    return null;
  }

  const inputClassName = [
    "setting-input w-full",
    isSaving ? "opacity-60 pointer-events-none" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card p={2} className="w-full">
      <Stack direction="column" gap={error ? 2 : 1} className="w-full">
        {error ? <InlineError message={error} /> : null}
        <Stack gap={2} align="center" className="flex-wrap w-full">
          {!hasParticipants && selfParticipant ? (
            <Button
              icon="user-round-plus"
              onClick={handleAssignMe}
              disabled={isSaving}
              className="whitespace-nowrap"
            >
              Assign it to me
            </Button>
          ) : null}
          <div className="flex-1 min-w-[12rem]">
            <AutoComplete
              values={availablePersonOptions}
              onSelect={handleAssignPerson}
              placeholder="Add participant"
              className={inputClassName}
            />
          </div>
        </Stack>
      </Stack>
    </Card>
  );
};

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "untitled";

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
