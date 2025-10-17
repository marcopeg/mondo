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
  count?: number;
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

  const file = app.metadataCache.getFirstLinkpathDest(
    cleanedTarget,
    sourcePath
  );
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

const buildOpenedEntries = (
  raw: unknown,
  app: App,
  sourcePath: string,
  excludedPaths: Set<string>
): DailyEntry[] => {
  if (!raw) {
    return [];
  }

  const values = Array.isArray(raw) ? raw : [raw];
  const entries: DailyEntry[] = [];
  const seen = new Map<string, DailyEntry>();

  values.forEach((value) => {
    let link: string | null = null;
    let count = 1;

    if (typeof value === "string") {
      link = value.trim();
    } else if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      const maybeLink =
        objectValue.link ?? objectValue.raw ?? objectValue.value;
      if (typeof maybeLink === "string" && maybeLink.trim()) {
        link = maybeLink.trim();
      }
      const maybeCount = objectValue.count;
      if (typeof maybeCount === "number" && Number.isFinite(maybeCount)) {
        const normalized = Math.floor(maybeCount);
        if (normalized > 0) {
          count = normalized;
        }
      } else if (typeof maybeCount === "string") {
        const parsed = Number.parseInt(maybeCount, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          count = parsed;
        }
      }
    }

    if (!link) {
      return;
    }

    const { file, alias } = resolveLinkTarget(link, app, sourcePath);
    if (!file) {
      return;
    }
    if (excludedPaths.has(file.path)) {
      return;
    }

    const existing = seen.get(file.path);
    if (existing) {
      existing.count = (existing.count ?? 0) + count;
      return;
    }

    const entry: DailyEntry = {
      path: file.path,
      display: getDisplayLabel(file, alias, app, sourcePath),
      icon: getIconForFile(file, app),
      count,
    };
    seen.set(file.path, entry);
    entries.push(entry);
  });

  return entries;
};

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
    </Card>
  );
};

export const DailyNoteLinks = () => {
  const context = useEntityFile();
  const app = useApp();

  const cachedFile = context.file;
  const sourcePath = cachedFile?.file?.path ?? null;

  if (!cachedFile || !cachedFile.file || !sourcePath) {
    console.log("[DailyNoteLinks] No cached file or source path");
    return null;
  }

  const frontmatter = cachedFile.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;

  console.log(
    "[DailyNoteLinks] Rendering for:",
    sourcePath,
    "frontmatter:",
    frontmatter
  );

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
    return buildEntries(
      frontmatter.changedToday,
      app,
      sourcePath,
      createdPaths
    );
  }, [app, frontmatter, sourcePath, createdEntries]);

  const openedEntries = useMemo(() => {
    if (!frontmatter) {
      return [] as DailyEntry[];
    }
    const excluded = new Set(
      [...createdEntries, ...changedEntries].map((entry) => entry.path)
    );
    return buildOpenedEntries(
      frontmatter.openedToday,
      app,
      sourcePath,
      excluded
    );
  }, [app, frontmatter, sourcePath, createdEntries, changedEntries]);

  if (
    createdEntries.length === 0 &&
    changedEntries.length === 0 &&
    openedEntries.length === 0
  ) {
    return null;
  }

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
