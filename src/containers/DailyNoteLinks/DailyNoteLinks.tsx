import { useMemo } from "react";
import { useEntityFile } from "@/context/EntityFileProvider";
import { useApp } from "@/hooks/use-app";
import { Card } from "@/components/ui/Card";
import { Stack } from "@/components/ui/Stack";
import Typography from "@/components/ui/Typography";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import { CRM_ENTITIES, isCRMEntityType } from "@/entities";
import type { App, TFile } from "obsidian";

type DailyEntry = {
  path: string;
  display: string;
  icon: string;
};

const DEFAULT_ICON = "file-text";

const normalizeLinkValues = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  if (typeof raw === "string" && raw.trim()) {
    return [raw.trim()];
  }

  return [];
};

const resolveLinkTarget = (
  value: string,
  app: App,
  sourcePath: string
): { file: TFile | null; alias: string | null } => {
  let inner = value.trim();
  if (!inner) {
    return { file: null, alias: null };
  }

  if (inner.startsWith("[[") && inner.endsWith("]]")) {
    inner = inner.slice(2, -2);
  }

  const [target, alias] = inner.split("|");
  const cleanedTarget = target.split("#")[0]?.trim() ?? "";
  if (!cleanedTarget) {
    return { file: null, alias: null };
  }

  const file = app.metadataCache.getFirstLinkpathDest(cleanedTarget, sourcePath);
  if (!file) {
    return { file: null, alias: null };
  }

  return { file, alias: alias ? alias.trim() : null };
};

const getIconForFile = (file: TFile, app: App): string => {
  const cache = app.metadataCache.getFileCache(file);
  const type = cache?.frontmatter?.type;
  if (typeof type === "string") {
    const normalized = type.trim().toLowerCase();
    if (isCRMEntityType(normalized)) {
      return CRM_ENTITIES[normalized]?.icon ?? DEFAULT_ICON;
    }
  }
  return DEFAULT_ICON;
};

const getDisplayLabel = (
  file: TFile,
  alias: string | null,
  app: App,
  sourcePath: string
): string => {
  if (alias && alias.length > 0) {
    return alias;
  }
  return app.metadataCache.fileToLinktext(file, sourcePath, false);
};

const buildEntries = (
  raw: unknown,
  app: App,
  sourcePath: string,
  excludedPaths: Set<string>
): DailyEntry[] => {
  const values = normalizeLinkValues(raw);
  if (!values.length) {
    return [];
  }

  const seen = new Set<string>();
  const entries: DailyEntry[] = [];

  values.forEach((value) => {
    const { file, alias } = resolveLinkTarget(value, app, sourcePath);
    if (!file) {
      return;
    }
    if (excludedPaths.has(file.path) || seen.has(file.path)) {
      return;
    }
    seen.add(file.path);

    entries.push({
      path: file.path,
      display: getDisplayLabel(file, alias, app, sourcePath),
      icon: getIconForFile(file, app),
    });
  });

  return entries;
};

type DailyNoteListCardProps = {
  title: string;
  icon: string;
  entries: DailyEntry[];
};

const DailyNoteListCard = ({ title, icon, entries }: DailyNoteListCardProps) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card title={title} icon={icon}>
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
              <Typography variant="body">{entry.display}</Typography>
            </Link>
          </Stack>
        ))}
      </Stack>
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
    return buildEntries(frontmatter.createdToday, app, sourcePath, new Set());
  }, [app, frontmatter, sourcePath]);

  const changedEntries = useMemo(() => {
    if (!frontmatter) {
      return [] as DailyEntry[];
    }
    const createdPaths = new Set(createdEntries.map((entry) => entry.path));
    return buildEntries(frontmatter.changedToday, app, sourcePath, createdPaths);
  }, [app, frontmatter, sourcePath, createdEntries]);

  if (createdEntries.length === 0 && changedEntries.length === 0) {
    return null;
  }

  return (
    <Stack direction="column" gap={2}>
      <DailyNoteListCard title="Created Today" icon="sparkles" entries={createdEntries} />
      <DailyNoteListCard title="Changed Today" icon="history" entries={changedEntries} />
    </Stack>
  );
};

export default DailyNoteLinks;
