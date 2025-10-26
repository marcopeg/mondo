import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type Align = "left" | "right" | "center";
type BacklinksColumn =
  | { type: "cover"; mode?: "cover" | "contain"; align?: Align }
  | { type: "show"; label?: string; align?: Align }
  | { type: "date"; label?: string; align?: Align }
  | { type: "attribute"; key: string; label?: string; align?: Align };

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
  { type: "date", label: "Date", align: "right" },
];

const toTitleCase = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const buildMatchProperties = (hostType: CRMEntityType): string[] => {
  // Ignore generic "related" unless explicitly provided via panel.properties.
  // Default matching uses only host-type-specific keys.
  const base: string[] = [hostType];
  if (hostType === "person") base.push("people", "participants");
  if (hostType === "team") base.push("teams");
  if (hostType === "company") base.push("companies");
  return Array.from(
    new Set(base.map((p) => p.trim()).filter((p): p is string => p.length > 0))
  );
};

const buildLinkProperties = (hostType: CRMEntityType): string[] => {
  // For creating new backlinks, we intentionally avoid the generic "related"
  // key. We only write the host type (and type-specific pluralizations) to
  // keep frontmatter clean going forward.
  const base: string[] = [hostType];
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

const getFrontmatterRaw = (entry: TCachedFile, key: string): string => {
  const fm =
    (entry.cache?.frontmatter as Record<string, unknown> | undefined) ?? {};
  const raw = fm[key];
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) {
    return raw
      .map((v) =>
        typeof v === "string" ? v : v == null ? "" : JSON.stringify(v)
      )
      .filter((s) => s.trim().length > 0)
      .join(", ");
  }
  try {
    return JSON.stringify(raw);
  } catch (_) {
    return String(raw);
  }
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

  // Determine property to match (memoized for stable identity)
  const legacyTargetIsEntity =
    legacyTargetOriginal && isCRMEntityType(legacyTargetOriginal.toLowerCase());
  const propertyFromTarget = useMemo(() => {
    if (panel.properties || panel.prop) {
      // handled below in matchProperties
      return [] as string[];
    }
    if (targetKeyRawOriginal) {
      return [targetKeyRawOriginal];
    }
    if (legacyTargetOriginal && !legacyTargetIsEntity) {
      return [legacyTargetOriginal];
    }
    return [] as string[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    panel.properties,
    panel.prop,
    targetKeyRawOriginal,
    legacyTargetOriginal,
    legacyTargetIsEntity,
  ]);

  const panelKey = useMemo(() => {
    return `backlinks:${effectiveTargetType}${
      propertyFromTarget.length ? `:${propertyFromTarget[0]}` : ""
    }`;
  }, [effectiveTargetType, propertyFromTarget]);
  const defaultTitle =
    CRM_ENTITIES[effectiveTargetType]?.name ||
    toTitleCase(effectiveTargetType) + "s";
  // Normalize columns: if none configured, use defaults. Also apply sensible
  // per-type default alignment (dates right, others left) when align omitted.
  const rawColumns =
    panel.columns && panel.columns.length > 0 ? panel.columns : DEFAULT_COLUMNS;
  const columns: BacklinksColumn[] = rawColumns.map((c) => {
    const defaultAlign: Align = c.type === "date" ? "right" : "left";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const col = c as any;
    return { ...col, align: col.align ?? defaultAlign } as BacklinksColumn;
  });
  const visibility = panel.visibility ?? "always";
  const pageSize = panel.pageSize ?? 5;
  const sortConfig = useMemo(
    () =>
      panel.sort ?? {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
    [panel.sort]
  );

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

    // At this point effectiveTargetType is guaranteed non-null (early return above)
    return buildMatchProperties(effectiveTargetType as CRMEntityType);
  }, [panel.properties, panel.prop, propertyFromTarget, effectiveTargetType]);

  const matchKey = useMemo(() => matchProperties.join("|"), [matchProperties]);

  const filterFn = useCallback(
    (candidate: TCachedFile) => {
      if (!candidate.file || candidate.file.path === hostFile.path)
        return false;
      return matchesAnyPropertyLink(candidate, matchProperties, hostFile);
    },
    // Depend on hostFile path and the stable matchKey to avoid needless re-creation
    [hostFile, hostFile?.path, matchKey]
  );

  const entries = useFiles(effectiveTargetType, { filter: filterFn });

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

  // Local optimistic ordering to ensure immediate visual update post-drop.
  // This wraps the hook's onReorder so the UI reflects the final order instantly,
  // even if persistence or cache updates are momentarily delayed.
  const [optimisticOrdered, setOptimisticOrdered] = useState<
    TCachedFile[] | null
  >(null);
  const optimisticSetAtRef = useMemo(() => ({ time: 0 }), []);
  const clearTimerRef = useMemo<{ id: number | null }>(
    () => ({ id: null }),
    []
  );
  const keyOf = useCallback((e: TCachedFile) => e.file?.path ?? "", []);

  const handleReorderImmediate = useCallback(
    (next: TCachedFile[]) => {
      // Reflect new order immediately
      setOptimisticOrdered(next);
      optimisticSetAtRef.time = Date.now();
      // Delegate to the hook for persistence and state sync
      onReorder?.(next);
    },
    [onReorder, optimisticSetAtRef]
  );

  // Clear the optimistic state once the hook-provided ordered items match
  // the optimistic order (by identity of file paths), ensuring a smooth handoff.
  useEffect(() => {
    if (!optimisticOrdered) return;
    const a = optimisticOrdered.map(keyOf);
    const b = ordered.map(keyOf);
    const sameLength = a.length === b.length;
    const same = sameLength && a.every((id, i) => id === b[i]);
    if (!same) return;
    const MIN_HOLD_MS = 150;
    const elapsed = Date.now() - optimisticSetAtRef.time;
    const clear = () => setOptimisticOrdered(null);
    if (elapsed >= MIN_HOLD_MS) {
      clear();
      return;
    }
    // Hold the optimistic view a touch longer to absorb cache/UI churn
    if (clearTimerRef.id) {
      window.clearTimeout(clearTimerRef.id);
    }
    clearTimerRef.id = window.setTimeout(() => {
      // Re-check match before clearing in case of intervening changes
      const aa = (optimisticOrdered ?? []).map(keyOf);
      const bb = ordered.map(keyOf);
      const ok = aa.length === bb.length && aa.every((id, i) => id === bb[i]);
      if (ok) clear();
      clearTimerRef.id = null;
    }, MIN_HOLD_MS - elapsed);
  }, [ordered, optimisticOrdered, keyOf, optimisticSetAtRef, clearTimerRef]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) return;
      // Guard: avoid writing frontmatter if the value hasn't actually changed.
      // Some containers may call onCollapseChange on mount or every render.
      // Persist only when there's a real state transition to prevent re-renders loops.
      try {
        const currentCollapsed = (file.cache?.frontmatter as any)?.crmState?.[
          panelKey
        ]?.collapsed;
        if (currentCollapsed === isCollapsed) {
          return;
        }
      } catch (_) {
        // If reading cache fails, proceed with best effort below.
      }
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
    [app, hostFile, panelKey, file.cache?.frontmatter]
  );

  const [isCreating, setIsCreating] = useState(false);
  const actions = useMemo(() => {
    // default createEntity.enabled should be true unless explicitly disabled
    const createCfg = panel.createEntity ?? { enabled: true };
    if (createCfg.enabled === false)
      return [] as { key: string; content: ReactNode }[];
    // If user didn't specify a title template, provide a sensible default
    // like "Untitled Facts" (based on the target entity's configured name).
    const titleTemplate = createCfg.title ?? `Untitled ${defaultTitle}`;
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
                    targetType: effectiveTargetType as string,
                    hostEntity: file,
                    titleTemplate,
                    attributeTemplates: createCfg.attributes as any,
                    // link back using only hostType-specific properties (no generic "related")
                    linkProperties: buildLinkProperties(
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
    defaultTitle,
  ]);

  const panelTitle = panel.title || defaultTitle;
  // Subtitle is optional: if not provided, skip rendering
  const panelSubtitle = panel.subtitle ?? undefined;
  // Icon is optional: if not provided, skip rendering
  const panelIcon = panel.icon ?? undefined;

  // After all hooks have executed, check visibility
  const hasEntries = ordered.length > 0;
  if (!hasEntries && visibility === "notEmpty") {
    return null;
  }

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
        items={optimisticOrdered ?? ordered}
        getKey={(e) => e.file!.path}
        pageSize={pageSize}
        sortable={sortConfig.strategy === "manual" && sortable}
        onReorder={
          sortConfig.strategy === "manual" ? handleReorderImmediate : undefined
        }
        getSortableId={(e) => e.file!.path}
        emptyLabel={`No ${panelTitle.toLowerCase()} yet`}
        renderRow={(entry) => {
          const path = entry.file!.path;
          const show = getEntityDisplayName(entry);
          const date = getFrontmatterString(entry, "date");
          return (
            <>
              {columns.map((col, idx) => {
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left";
                if (col.type === "cover") {
                  const src = getCoverResource(app, entry);
                  return (
                    <Table.Cell
                      key={`c-${idx}`}
                      className={`px-0 py-2 align-middle w-16 ${alignClass}`}
                      style={{ width: "4rem" }}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={show}
                          className="h-16 w-16 mx-auto block"
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
                      className={`px-2 py-2 align-middle break-words overflow-hidden ${alignClass}`}
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
                      className={`px-2 py-2 align-middle ${alignClass}`}
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
                if (col.type === "attribute") {
                  // Read raw frontmatter so we can handle arrays and wiki links [[...]] properly
                  const fm =
                    (entry.cache?.frontmatter as
                      | Record<string, unknown>
                      | undefined) ?? {};
                  const raw = fm[col.key];
                  const label = col.label ? `${col.label}: ` : "";

                  const isWikiLink = (s: string): boolean =>
                    /\[\[[^\]]+\]\]/.test(s.trim());
                  const parseWikiLink = (
                    s: string
                  ): { target: string; alias?: string } => {
                    const inner = s.trim().slice(2, -2);
                    const [t, a] = inner.split("|");
                    return { target: (t || "").trim(), alias: a?.trim() };
                  };
                  const resolveWikiToPath = (
                    app: App,
                    sourcePath: string | undefined,
                    target: string
                  ): string | null => {
                    const normalized = target.replace(/\.md$/i, "");
                    const dest = app.metadataCache.getFirstLinkpathDest(
                      normalized,
                      sourcePath ?? ""
                    );
                    return dest instanceof TFile ? dest.path : null;
                  };

                  const renderItem = (item: unknown, i: number) => {
                    if (typeof item === "string" && isWikiLink(item)) {
                      const { target, alias } = parseWikiLink(item);
                      const destPath = resolveWikiToPath(
                        app,
                        entry.file?.path,
                        target
                      );
                      const text = alias || target;
                      return destPath ? (
                        <Button key={`a-${i}`} to={destPath} variant="link">
                          {text}
                        </Button>
                      ) : (
                        <span key={`a-${i}`}>{text}</span>
                      );
                    }
                    if (
                      typeof item === "string" ||
                      typeof item === "number" ||
                      typeof item === "boolean"
                    ) {
                      return <span key={`a-${i}`}>{String(item)}</span>;
                    }
                    try {
                      return <span key={`a-${i}`}>{JSON.stringify(item)}</span>;
                    } catch (_) {
                      return <span key={`a-${i}`}>{String(item)}</span>;
                    }
                  };

                  const nodes: ReactNode[] = [];
                  if (Array.isArray(raw)) {
                    raw.forEach((it, i) => {
                      if (i > 0) nodes.push(<span key={`s-${i}`}>, </span>);
                      nodes.push(renderItem(it, i));
                    });
                  } else if (raw !== undefined && raw !== null) {
                    nodes.push(renderItem(raw, 0));
                  }

                  return (
                    <Table.Cell
                      key={`c-${idx}`}
                      className={`px-2 py-2 align-middle ${alignClass}`}
                    >
                      {nodes.length > 0 ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {label}
                          {nodes}
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
                  <Table.Cell
                    key={`c-${idx}`}
                    className={`px-2 py-2 align-middle ${alignClass}`}
                  >
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
