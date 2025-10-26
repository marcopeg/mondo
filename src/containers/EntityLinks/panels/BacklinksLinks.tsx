import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { useApp } from "@/hooks/use-app";
import { CRM_ENTITIES, type CRMEntityType } from "@/entities";
import { isCRMEntityType } from "@/types/CRMFileType";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import createEntityForEntity from "@/utils/createEntityForEntity";
import type { TCachedFile } from "@/types/TCachedFile";
import { TFile, type App } from "obsidian";

type BacklinksColumn =
  | { type: "cover"; mode?: "cover" | "contain" }
  | { type: "show"; label?: string }
  | { type: "date"; label?: string };

type BacklinksSortConfig =
  | { strategy: "manual" }
  | { strategy: "column"; column: "show" | "date"; direction?: "asc" | "desc" };

type BacklinksCreateEntityConfig = {
  enabled?: boolean;
  title?: string;
  attributes?: Record<string, string | number | boolean>;
};

type BacklinksPanelConfig = {
  collapsed?: boolean;
  // New API
  targetType?: CRMEntityType | string; // filter notes by this entity type
  targetKey?: string; // property to match on the target notes
  // Backward compatibility (deprecated)
  target?: CRMEntityType | string; // used previously as either type or property
  // Property overrides (highest priority)
  properties?: string[] | string;
  prop?: string[] | string; // legacy/alias
  // Presentation
  title?: string;
  subtitle?: string;
  icon?: string;
  columns?: BacklinksColumn[];
  visibility?: "always" | "notEmpty";
  pageSize?: number;
  // Create button and sorting
  createEntity?: BacklinksCreateEntityConfig;
  sort?: BacklinksSortConfig;
};

type BacklinksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

const DEFAULT_COLUMNS: BacklinksColumn[] = [
  { type: "show" },
  { type: "date", label: "Date" },
];

const toTitleCase = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const buildMatchProperties = (hostType: CRMEntityType): string[] => {
  const base = ["related", hostType];
  if (hostType === "person") base.push("people", "participants");
  if (hostType === "team") base.push("teams");
  if (hostType === "company") base.push("companies");
  return Array.from(
    new Set(base.map((p) => p.trim()).filter((p): p is string => p.length > 0))
  );
};

const getFrontmatterString = (entry: TCachedFile, key: string): string => {
  const fm =
    (entry.cache?.frontmatter as Record<string, unknown> | undefined) ?? {};
  const raw = fm[key];
  if (!raw) return "";
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && item.trim()) return item.trim();
    }
    return "";
  }
  return typeof raw === "string" ? raw.trim() : String(raw);
};

const getCoverResource = (app: App, entry: TCachedFile): string | null => {
  const raw = getFrontmatterString(entry, "cover");
  if (!raw) return null;

  let target = raw;
  if (target.startsWith("[[") && target.endsWith("]]")) {
    const inner = target.slice(2, -2);
    target = inner.split("|")[0]?.trim() || inner.trim();
  }

  const abs = app.vault.getAbstractFileByPath(target);
  if (abs instanceof TFile) {
    return app.vault.getResourcePath(abs);
  }
  const normalized = target.replace(/\.md$/i, "");
  const dest = app.metadataCache.getFirstLinkpathDest(normalized, "");
  return dest instanceof TFile ? app.vault.getResourcePath(dest) : null;
};

export const BacklinksLinks = ({ file, config }: BacklinksLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const hostType = (file.cache?.frontmatter?.type || "") as string;

  if (!hostFile || !hostType) {
    return (
      <Card collapsible collapsed={false} icon="link-2" title="Backlinks">
        <div className="px-2 py-2 text-xs text-[var(--text-muted)]">
          Save this note to start linking related entries.
        </div>
      </Card>
    );
  }

  const panel = (config || {}) as BacklinksPanelConfig;
  const targetTypeRawOriginal = String(panel.targetType ?? "").trim();
  const targetKeyRawOriginal = String(panel.targetKey ?? "").trim();
  const legacyTargetOriginal = String(panel.target ?? "").trim();
  const hostTypeNormalized = String(hostType || "")
    .trim()
    .toLowerCase();

  // Determine effective target type (entity type to list)
  let effectiveTargetType: CRMEntityType | null = null;
  const targetTypeLower = targetTypeRawOriginal.toLowerCase();
  if (targetTypeRawOriginal && isCRMEntityType(targetTypeLower)) {
    effectiveTargetType = targetTypeLower as CRMEntityType;
  } else if (
    legacyTargetOriginal &&
    isCRMEntityType(legacyTargetOriginal.toLowerCase())
  ) {
    effectiveTargetType = legacyTargetOriginal.toLowerCase() as CRMEntityType;
  } else if (isCRMEntityType(hostTypeNormalized)) {
    effectiveTargetType = hostTypeNormalized as CRMEntityType; // fallback to host type
  }
  if (!effectiveTargetType) {
    return null;
  }

  // Determine property to match
  const legacyTargetIsEntity =
    legacyTargetOriginal && isCRMEntityType(legacyTargetOriginal.toLowerCase());
  let propertyFromTarget: string[] = [];
  if (panel.properties || panel.prop) {
    // handled below in matchProperties
    propertyFromTarget = [];
  } else if (targetKeyRawOriginal) {
    propertyFromTarget = [targetKeyRawOriginal];
  } else if (legacyTargetOriginal && !legacyTargetIsEntity) {
    propertyFromTarget = [legacyTargetOriginal];
  }

  const panelKey = `backlinks:${effectiveTargetType}${
    propertyFromTarget.length ? `:${propertyFromTarget[0]}` : ""
  }`;
  const columns =
    panel.columns && panel.columns.length > 0 ? panel.columns : DEFAULT_COLUMNS;
  const visibility = panel.visibility ?? "always";
  const pageSize = panel.pageSize ?? 5;
  const sortConfig = panel.sort ?? {
    strategy: "column",
    column: "show",
    direction: "asc",
  };

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.[panelKey]?.collapsed === true) return true;
    if (crmState?.[panelKey]?.collapsed === false) return false;
    return panel.collapsed !== false; // default to expanded unless explicitly false
  }, [file.cache?.frontmatter, panel.collapsed, panelKey]);

  const matchProperties = useMemo(() => {
    // explicit overrides via properties/prop
    const override = (panel.properties ?? panel.prop) as
      | string[]
      | string
      | undefined;
    let props: string[] = [];
    if (typeof override === "string") props = [override];
    else if (Array.isArray(override)) props = override;

    if (props.length > 0) {
      return Array.from(
        new Set(props.map((p) => String(p).trim()).filter(Boolean))
      );
    }

    if (propertyFromTarget.length > 0) {
      return propertyFromTarget;
    }

    return buildMatchProperties(effectiveTargetType);
  }, [panel.properties, panel.prop, propertyFromTarget, effectiveTargetType]);

  const entries = useFiles(effectiveTargetType, {
    filter: useCallback(
      (candidate: TCachedFile) => {
        if (!candidate.file || candidate.file.path === hostFile.path)
          return false;
        return matchesAnyPropertyLink(candidate, matchProperties, hostFile);
      },
      [hostFile, matchProperties]
    ),
  });

  const sortByColumn = useCallback(
    (items: TCachedFile[]) => {
      if (sortConfig.strategy !== "column") return items;
      const direction = sortConfig.direction === "desc" ? -1 : 1;
      const key = sortConfig.column;
      const safe = [...items];
      safe.sort((a, b) => {
        let va = "";
        let vb = "";
        if (key === "show") {
          va = getEntityDisplayName(a).toLowerCase();
          vb = getEntityDisplayName(b).toLowerCase();
        } else if (key === "date") {
          va = getFrontmatterString(a, "date");
          vb = getFrontmatterString(b, "date");
        }
        if (va < vb) return -1 * direction;
        if (va > vb) return 1 * direction;
        return 0;
      });
      return safe;
    },
    [sortConfig]
  );

  // When manual sorting is enabled, persist order for this panelKey
  const {
    items: ordered,
    onReorder,
    sortable,
  } = useEntityLinkOrdering<TCachedFile>({
    file,
    items: sortConfig.strategy === "manual" ? entries : sortByColumn(entries),
    frontmatterKey: panelKey,
    getItemId: (e) => e.file?.path,
    fallbackSort: (items) => sortByColumn(items),
  });

  const hasEntries = ordered.length > 0;
  if (!hasEntries && visibility === "notEmpty") {
    return null;
  }

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;
      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof (frontmatter as any).crmState !== "object" ||
            (frontmatter as any).crmState === null
          ) {
            (frontmatter as any).crmState = {};
          }
          const panelState = (frontmatter as any).crmState[panelKey];
          if (typeof panelState !== "object" || panelState === null) {
            (frontmatter as any).crmState[panelKey] = {};
          }
          (frontmatter as any).crmState[panelKey].collapsed = isCollapsed;
        });
      } catch (error) {
        console.error(
          "BacklinksLinks: failed to persist collapse state",
          error
        );
      }
    },
    [app, hostFile, panelKey]
  );

  const [isCreating, setIsCreating] = useState(false);
  const actions = useMemo(() => {
    const createCfg = panel.createEntity;
    if (!createCfg || createCfg.enabled === false)
      return [] as { key: string; content: ReactNode }[];
    return [
      {
        key: "create-entity",
        content: (
          <Button
            variant="link"
            icon="plus"
            aria-label={`Create ${effectiveTargetType}`}
            disabled={isCreating}
            onClick={() => {
              if (isCreating) return;
              setIsCreating(true);
              (async () => {
                try {
                  await createEntityForEntity({
                    app,
                    targetType: effectiveTargetType,
                    hostEntity: file,
                    titleTemplate: createCfg.title,
                    attributeTemplates: createCfg.attributes as any,
                    // link in both "related" and hostType
                    linkProperties: buildMatchProperties(
                      hostType as CRMEntityType
                    ),
                    openAfterCreate: true,
                  });
                } catch (error) {
                  console.error(
                    "BacklinksLinks: failed to create entity",
                    error
                  );
                } finally {
                  setIsCreating(false);
                }
              })();
            }}
          />
        ),
      },
    ];
  }, [
    panel.createEntity,
    isCreating,
    app,
    file,
    effectiveTargetType,
    hostType,
  ]);

  const defaultTitle =
    CRM_ENTITIES[effectiveTargetType]?.name ||
    toTitleCase(effectiveTargetType) + "s";
  const panelTitle = panel.title || defaultTitle;
  const panelSubtitle =
    panel.subtitle || `Linked to ${getEntityDisplayName(file)}`;
  const panelIcon = panel.icon || "link-2";

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon={panelIcon}
      title={panelTitle}
      subtitle={panelSubtitle}
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={ordered}
        getKey={(e) => e.file!.path}
        pageSize={pageSize}
        sortable={sortConfig.strategy === "manual" && sortable}
        onReorder={sortConfig.strategy === "manual" ? onReorder : undefined}
        getSortableId={(e) => e.file!.path}
        emptyLabel={`No ${panelTitle.toLowerCase()} yet`}
        renderRow={(entry) => {
          const path = entry.file!.path;
          const show = getEntityDisplayName(entry);
          const date = getFrontmatterString(entry, "date");
          return (
            <>
              {columns.map((col, idx) => {
                if (col.type === "cover") {
                  const src = getCoverResource(app, entry);
                  return (
                    <Table.Cell
                      key={`c-${idx}`}
                      className="px-2 py-2 align-top"
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={show}
                          className="h-16 w-16 mx-auto"
                          style={{
                            objectFit:
                              col.mode === "contain" ? "contain" : "cover",
                          }}
                        />
                      ) : null}
                    </Table.Cell>
                  );
                }
                if (col.type === "show") {
                  return (
                    <Table.Cell
                      key={`c-${idx}`}
                      className="px-2 py-2 align-top break-words overflow-hidden"
                    >
                      <Button
                        to={path}
                        variant="link"
                        className="break-words whitespace-normal"
                      >
                        {show}
                      </Button>
                    </Table.Cell>
                  );
                }
                if (col.type === "date") {
                  const label = col.label ? `${col.label} ` : "";
                  return (
                    <Table.Cell
                      key={`c-${idx}`}
                      className="px-2 py-2 align-top text-right"
                    >
                      {date ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {label}
                          {date}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">
                          —
                        </span>
                      )}
                    </Table.Cell>
                  );
                }
                return (
                  <Table.Cell key={`c-${idx}`} className="px-2 py-2 align-top">
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  </Table.Cell>
                );
              })}
            </>
          );
        }}
      />
    </Card>
  );
};

export default BacklinksLinks;
