import { useMemo } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import Typography from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import {
  extractDailyLinkReferences,
  extractDailyOpenedReferences,
  type DailyNoteReference,
} from "@/utils/daily-note-references";

type DailyEntry = {
  path: string;
  display: string;
  icon: string;
  count?: number;
};

const toDailyEntry = (reference: DailyNoteReference): DailyEntry => ({
  path: reference.path,
  display: reference.label,
  icon: reference.icon,
  count: reference.count,
});

type DailyNoteListCardProps = {
  title: string;
  icon: string;
  entries: DailyEntry[];
  showCount?: boolean;
};

const DailyNoteListCard = ({
  title,
  icon,
  entries,
  showCount = false,
}: DailyNoteListCardProps) => {
  return (
    <Card title={title} icon={icon}>
      {entries.length === 0 ? (
        <Typography variant="body" className="text-muted">
          None
        </Typography>
      ) : (
        <Stack direction="column" gap={2}>
          {entries.map((entry) => (
            <Stack
              key={entry.path}
              direction="row"
              align="center"
              gap={2}
              className="items-center"
            >
              <Icon name={entry.icon} />
              <Link to={entry.path}>
                <Typography variant="body">
                  {entry.display}
                  {showCount && typeof entry.count === "number"
                    ? ` (x${entry.count})`
                    : null}
                </Typography>
              </Link>
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
};

export const DailyNoteLinks = () => {
  const context = useEntityFile();
  const app = useApp();

  const cachedFile = context.file;
  const sourcePath = cachedFile?.file?.path ?? null;

  if (!cachedFile || !cachedFile.file || !sourcePath) {
    return null;
  }

  const frontmatter = cachedFile.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  const createdEntries = useMemo(() => {
    if (!frontmatter) {
      return [] as DailyEntry[];
    }
    const excluded = new Set<string>([sourcePath]);
    return extractDailyLinkReferences(
      frontmatter.createdToday,
      app,
      sourcePath,
      excluded
    ).map(toDailyEntry);
  }, [app, frontmatter, sourcePath]);

  const changedEntries = useMemo(() => {
    if (!frontmatter) {
      return [] as DailyEntry[];
    }
    const excluded = new Set<string>([
      sourcePath,
      ...createdEntries.map((entry) => entry.path),
    ]);
    return extractDailyLinkReferences(
      frontmatter.changedToday,
      app,
      sourcePath,
      excluded
    ).map(toDailyEntry);
  }, [app, createdEntries, frontmatter, sourcePath]);

  const openedEntries = useMemo(() => {
    if (!frontmatter) {
      return [] as DailyEntry[];
    }
    const excluded = new Set<string>();
    excluded.add(sourcePath);
    return extractDailyOpenedReferences(
      frontmatter.openedToday,
      app,
      sourcePath,
      excluded
    ).map(toDailyEntry);
  }, [app, frontmatter, sourcePath]);

  return (
    <Stack direction="column" gap={2}>
      <DailyNoteListCard
        title="Created Today"
        icon="sparkles"
        entries={createdEntries}
      />
      <DailyNoteListCard
        title="Changed Today"
        icon="history"
        entries={changedEntries}
      />
      <DailyNoteListCard
        title="Opened Today"
        icon="eye"
        entries={openedEntries}
        showCount
      />
    </Stack>
  );
};

export default DailyNoteLinks;
