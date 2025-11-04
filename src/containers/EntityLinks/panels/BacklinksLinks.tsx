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
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Cover } from "@/components/ui/Cover";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useEntityLinkOrdering } from "@/hooks/use-entity-link-ordering";
import { useApp } from "@/hooks/use-app";
import { MONDO_ENTITIES, type MondoEntityType } from "@/entities";
import { useEntityLinksLayout } from "@/context/EntityLinksLayoutContext";
import { isMondoEntityType } from "@/types/MondoFileType";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import createEntityForEntity from "@/utils/createEntityForEntity";
import type { TCachedFile } from "@/types/TCachedFile";
import { TFile, type App } from "obsidian";
import { MondoFileManager } from "@/utils/MondoFileManager";
import { MONDO_FILE_TYPES } from "@/types/MondoFileType";
import type { MondoEntityBacklinksLinkConfig } from "@/types/MondoEntityConfig";

type Align = "left" | "right" | "center";
type BacklinksColumn =
  | { type: "cover"; mode?: "cover" | "contain"; align?: Align }
  | { type: "entityIcon"; align?: Align }
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

type BacklinksPanelConfig = MondoEntityBacklinksLinkConfig;

type BacklinksLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
  order: number;
  panelType: string;
};

const DEFAULT_COLUMNS: BacklinksColumn[] = [
  { type: "show" },
  { type: "date", label: "Date", align: "right" },
];

const toTitleCase = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const buildMatchProperties = (hostType: MondoEntityType): string[] => {
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

const buildLinkProperties = (
  hostType: MondoEntityType,
  override?: string | string[]
): string[] => {
  // For creating new backlinks, avoid generic "related" and avoid auto-adding
  // plural synonyms. Use explicit panel overrides when provided; otherwise only
  // use the host type key (e.g., "company").
  if (override) {
    const list = Array.isArray(override) ? override : [override];
    return Array.from(
      new Set(list.map((p) => String(p).trim()).filter(Boolean))
    );
  }
  return [hostType].filter(Boolean);
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

export const BacklinksLinks = ({
  file,
  config,
  order,
  panelType,
}: BacklinksLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const hostFrontmatter = (file.cache?.frontmatter as any) ?? {};
  const hostType = String(
    hostFrontmatter.mondoType ?? hostFrontmatter.type ?? ""
  );

  if (!hostFile || !hostType) {
    return (
      <Card collapsible collapsed={false} icon="link-2" title="Backlinks">
        <div className="px-2 py-2 text-xs text-[var(--text-muted)]">
          Save this note to start linking related entries.
        </div>
      </Card>
    );
  }

  // Extract config from new nested structure or use legacy flat structure
  const extractedConfig = useMemo(() => {
    const cfg = (config || {}) as any;
    // If config.config exists, we're using the new structure
    if (cfg.config && typeof cfg.config === "object") {
      return cfg.config as BacklinksPanelConfig;
    }
    // Otherwise, use legacy flat structure
    return cfg as BacklinksPanelConfig;
  }, [config]);

  const panel = extractedConfig as BacklinksPanelConfig;
  const targetTypeRawOriginal = String(panel.targetType ?? "").trim();
  const targetKeyRawOriginal = String(panel.targetKey ?? "").trim();
  const legacyTargetOriginal = String(panel.target ?? "").trim();
  const hostTypeNormalized = String(hostType || "")
    .trim()
    .toLowerCase();

  // Determine effective target type (entity type to list)
  let effectiveTargetType: MondoEntityType | null = null;
  const targetTypeLower = targetTypeRawOriginal.toLowerCase();
  if (targetTypeRawOriginal && isMondoEntityType(targetTypeLower)) {
    effectiveTargetType = targetTypeLower as MondoEntityType;
  } else if (
    legacyTargetOriginal &&
    isMondoEntityType(legacyTargetOriginal.toLowerCase())
  ) {
    effectiveTargetType = legacyTargetOriginal.toLowerCase() as MondoEntityType;
  } else if (isMondoEntityType(hostTypeNormalized)) {
    effectiveTargetType = hostTypeNormalized as MondoEntityType; // fallback to host type
  }
  if (!effectiveTargetType) {
    return null;
  }

  // Determine property to match (memoized for stable identity)
  const legacyTargetIsEntity =
    legacyTargetOriginal &&
    isMondoEntityType(legacyTargetOriginal.toLowerCase());
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
    // Use the explicit key property if available (from top-level config)
    const topLevelKey = (config as any)?.key;
    if (topLevelKey) {
      return `backlinks:${topLevelKey}`;
    }
    // Otherwise fall back to computed key
    return `backlinks:${effectiveTargetType}${
      propertyFromTarget.length ? `:${propertyFromTarget[0]}` : ""
    }`;
  }, [config, effectiveTargetType, propertyFromTarget]);
  const { setCollapsedPanel } = useEntityLinksLayout();
  const defaultTitle =
    MONDO_ENTITIES[effectiveTargetType]?.name ||
    toTitleCase(effectiveTargetType) + "s";
  // Normalize columns: if none configured, use defaults. Also apply sensible
  // per-type default alignment (dates right, others left) when align omitted.
  const rawColumns =
    panel.columns && panel.columns.length > 0 ? panel.columns : DEFAULT_COLUMNS;
  const columns: BacklinksColumn[] = rawColumns.map((c) => {
    const defaultAlign: Align =
      c.type === "date" ? "right" : c.type === "entityIcon" ? "center" : "left";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const col = c as any;
    return { ...col, align: col.align ?? defaultAlign } as BacklinksColumn;
  });
  const visibility = panel.visibility ?? "always";
  // If pageSize is not provided, disable pagination (show all entries)
  const pageSize =
    typeof panel.pageSize === "number"
      ? panel.pageSize
      : Number.POSITIVE_INFINITY;
  const sortConfig = useMemo(
    () =>
      panel.sort ?? {
        strategy: "column",
        column: "date",
        direction: "desc",
      },
    [panel.sort]
  );

  const initialCollapsed = useMemo(() => {
    const mondoState = (file.cache?.frontmatter as any)?.mondoState;
    if (mondoState?.[panelKey]?.collapsed === true) return true;
    if (mondoState?.[panelKey]?.collapsed === false) return false;
    return panel.collapsed !== false; // default to expanded unless explicitly false
  }, [file.cache?.frontmatter, panel.collapsed, panelKey]);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

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
    return buildMatchProperties(effectiveTargetType as MondoEntityType);
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
  // --- Advanced FIND/Filter DSL evaluation ---------------------------------
  const fileManager = useMemo(() => MondoFileManager.getInstance(app), [app]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const listener = () => setRefreshTick((t) => t + 1);
    fileManager.addListener(listener);
    return () => fileManager.removeListener(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileManager]);

  const toArray = useCallback((v: string | string[] | undefined) => {
    if (!v) return [] as string[];
    return Array.isArray(v) ? v : [v];
  }, []);

  const getType = useCallback((e: TCachedFile | null | undefined): string => {
    const frontmatter = (e?.cache?.frontmatter as any) ?? {};
    return String(frontmatter.mondoType ?? frontmatter.type ?? "").trim();
  }, []);

  const resolveWikiOrPathToFile = useCallback(
    (source: TCachedFile, raw: unknown): TFile | null => {
      if (raw === undefined || raw === null) return null;
      let value = String(raw).trim();
      if (!value) return null;
      if (value.startsWith("[[") && value.endsWith("]]")) {
        const inner = value.slice(2, -2);
        value = inner.split("|")[0]?.trim() || inner.trim();
      }
      const abs = app.vault.getAbstractFileByPath(value);
      if (abs instanceof TFile) return abs;
      const normalized = value.replace(/\.md$/i, "");
      const dest = app.metadataCache.getFirstLinkpathDest(
        normalized,
        source.file?.path ?? ""
      );
      return dest instanceof TFile ? dest : null;
    },
    [app]
  );

  const extractLinkedFiles = useCallback(
    (node: TCachedFile, properties: string[]): TFile[] => {
      const fm =
        (node.cache?.frontmatter as Record<string, unknown> | undefined) ?? {};
      const results: TFile[] = [];
      for (const key of properties) {
        const raw = fm[key];
        const values = Array.isArray(raw)
          ? raw
          : raw !== undefined
          ? [raw]
          : [];
        for (const v of values) {
          const file = resolveWikiOrPathToFile(node, v);
          if (file) results.push(file);
        }
      }
      return results;
    },
    [resolveWikiOrPathToFile]
  );

  const uniqByPath = useCallback((arr: TCachedFile[]): TCachedFile[] => {
    const seen = new Set<string>();
    const out: TCachedFile[] = [];
    for (const e of arr) {
      const p = e.file?.path;
      if (!p || seen.has(p)) continue;
      seen.add(p);
      out.push(e);
    }
    return out;
  }, []);

  const evaluateRule = useCallback(
    (
      rule: NonNullable<BacklinksPanelConfig["find"]>["query"][number]
    ): TCachedFile[] => {
      let S: TCachedFile[] = file ? [file] : [];
      for (const step of rule.steps) {
        if ((step as any).out) {
          const { property, type } = (step as any).out as {
            property: string | string[];
            type?: string | string[];
          };
          const props = toArray(property);
          const typeFilter = toArray(type).map((t) => String(t).trim());
          const next: TCachedFile[] = [];
          for (const node of S) {
            const links = extractLinkedFiles(node, props);
            for (const tf of links) {
              const cached = fileManager.getFileByPath(tf.path);
              if (!cached) continue; // only consider Mondo-typed files
              if (
                typeFilter.length > 0 &&
                !typeFilter.includes(getType(cached))
              )
                continue;
              next.push(cached);
            }
          }
          S = uniqByPath(next);
          continue;
        }
        if ((step as any).in) {
          const { property, type } = (step as any).in as {
            property: string | string[];
            type?: string | string[];
          };
          const props = toArray(property);
          const typeList = toArray(type)
            .map((t) => String(t).trim())
            .filter(Boolean);
          const sourceTargets = S.map((n) => n.file!).filter(Boolean);
          const scanTypes =
            typeList.length > 0 ? typeList : (MONDO_FILE_TYPES as string[]);
          const acc: TCachedFile[] = [];
          for (const tt of scanTypes) {
            const files = fileManager.getFiles(tt as any);
            for (const cand of files) {
              // exclude self unless rule explicitly wants it later
              if (cand.file?.path === hostFile.path) continue;
              const match = sourceTargets.some((t) =>
                matchesAnyPropertyLink(cand, props, t)
              );
              if (match) acc.push(cand);
            }
          }
          S = uniqByPath(acc);
          continue;
        }
        if ((step as any).notIn) {
          const { property, type } = (step as any).notIn as {
            property: string | string[];
            type?: string | string[];
          };
          const props = toArray(property);
          const excluded = new Set(
            toArray(type)
              .map((t) => String(t).trim())
              .filter(Boolean)
          );
          const sourceTargets = S.map((n) => n.file!).filter(Boolean);
          const scanTypes = (MONDO_FILE_TYPES as string[]).filter(
            (tt) => !excluded.has(String(tt))
          );
          const acc: TCachedFile[] = [];
          for (const tt of scanTypes) {
            const files = fileManager.getFiles(tt as any);
            for (const cand of files) {
              if (cand.file?.path === hostFile.path) continue;
              const match = sourceTargets.some((t) =>
                matchesAnyPropertyLink(cand, props, t)
              );
              if (match) acc.push(cand);
            }
          }
          S = uniqByPath(acc);
          continue;
        }
        if ((step as any).filter) {
          const { type } = (step as any).filter as {
            type?: string | string[];
          };
          const typeFilter = toArray(type);
          if (typeFilter.length > 0) {
            S = S.filter((n) => typeFilter.includes(getType(n)));
          }
          continue;
        }
        if ((step as any).dedupe || (step as any).unique) {
          S = uniqByPath(S);
          continue;
        }
        if ((step as any).not === "host") {
          S = S.filter((n) => n.file?.path !== hostFile.path);
          continue;
        }
      }
      return uniqByPath(S);
    },
    [
      file,
      hostFile.path,
      toArray,
      extractLinkedFiles,
      fileManager,
      getType,
      uniqByPath,
    ]
  );

  type Comparator = {
    exists?: boolean;
    eq?: unknown;
    ne?: unknown;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
    contains?: unknown;
    notContains?: unknown;
    in?: unknown[];
    nin?: unknown[];
  };

  const getPropValue = useCallback(
    (entry: TCachedFile, path: string): unknown => {
      const fm =
        (entry.cache?.frontmatter as Record<string, unknown> | undefined) ?? {};
      if (path.endsWith(".length")) {
        const key = path.slice(0, -7);
        const raw = fm[key];
        if (Array.isArray(raw)) return raw.length;
        if (raw === undefined || raw === null) return 0;
        return 1;
      }
      return (fm as any)[path];
    },
    []
  );

  const normalizeScalar = (v: unknown): string => {
    if (v === undefined || v === null) return "";
    const s = String(v).trim();
    if (s.startsWith("[[") && s.endsWith("]]")) {
      const inner = s.slice(2, -2);
      return inner.split("|")[0]?.trim() || inner.trim();
    }
    return s;
  };

  const evalComparator = useCallback(
    (entry: TCachedFile, propPath: string, cmp: Comparator): boolean => {
      const val = getPropValue(entry, propPath);
      const has =
        val !== undefined &&
        val !== null &&
        !(Array.isArray(val) && val.length === 0);
      if (cmp.exists !== undefined) return cmp.exists ? has : !has;

      const applyToScalar = (scalar: unknown): boolean => {
        if (cmp.eq !== undefined) return scalar === cmp.eq;
        if (cmp.ne !== undefined) return scalar !== cmp.ne;
        if (typeof scalar === "number") {
          if (cmp.gt !== undefined && !(scalar > (cmp.gt as number)))
            return false;
          if (cmp.gte !== undefined && !(scalar >= (cmp.gte as number)))
            return false;
          if (cmp.lt !== undefined && !(scalar < (cmp.lt as number)))
            return false;
          if (cmp.lte !== undefined && !(scalar <= (cmp.lte as number)))
            return false;
        }
        if (cmp.in && Array.isArray(cmp.in))
          return (cmp.in as unknown[]).includes(scalar);
        if (cmp.nin && Array.isArray(cmp.nin))
          return !(cmp.nin as unknown[]).includes(scalar);
        return true;
      };

      // Special handling for contains with @this
      const containsThis = cmp.contains === "@this";
      const notContainsThis = cmp.notContains === "@this";
      if (containsThis || notContainsThis) {
        // If array => check any element links to host; if string => check it links to host
        if (Array.isArray(val)) {
          const ok = val.some((v) => {
            const tf = resolveWikiOrPathToFile(entry, v);
            if (!tf) return false;
            return tf.path === hostFile.path;
          });
          return containsThis ? ok : !ok;
        }
        const tf = resolveWikiOrPathToFile(entry, val);
        const ok = !!tf && tf.path === hostFile.path;
        return containsThis ? ok : !ok;
      }

      // Generic contains/notContains for arrays/strings
      if (cmp.contains !== undefined) {
        const needle = normalizeScalar(cmp.contains);
        if (Array.isArray(val))
          return val.map(normalizeScalar).includes(needle);
        if (typeof val === "string") return normalizeScalar(val) === needle;
        return false;
      }
      if (cmp.notContains !== undefined) {
        const needle = normalizeScalar(cmp.notContains);
        if (Array.isArray(val))
          return !val.map(normalizeScalar).includes(needle);
        if (typeof val === "string") return normalizeScalar(val) !== needle;
        return true;
      }

      if (Array.isArray(val)) {
        // Apply to array length by default for numeric comparisons
        const n = val.length;
        return applyToScalar(n);
      }
      if (
        typeof val === "number" ||
        typeof val === "string" ||
        typeof val === "boolean"
      ) {
        return applyToScalar(val);
      }
      // For unsupported shapes, only 'exists' would have applied earlier
      return true;
    },
    [getPropValue, hostFile.path, resolveWikiOrPathToFile]
  );

  const evalFilterExpr = useCallback(
    (entry: TCachedFile, expr: unknown): boolean => {
      if (!expr) return true;
      // logical
      if (typeof expr === "object" && expr !== null) {
        const obj = expr as Record<string, unknown>;
        if (Array.isArray((obj as any).all)) {
          const list = (obj as any).all as unknown[];
          return list.every((e) => evalFilterExpr(entry, e));
        }
        if (Array.isArray((obj as any).any)) {
          const list = (obj as any).any as unknown[];
          return list.some((e) => evalFilterExpr(entry, e));
        }
        if ((obj as any).not !== undefined) {
          return !evalFilterExpr(entry, (obj as any).not);
        }
        // predicate map: { "prop.path": { cmp... } }
        return Object.entries(obj).every(([propPath, cmp]) =>
          evalComparator(entry, propPath, (cmp || {}) as Comparator)
        );
      }
      return true;
    },
    [evalComparator]
  );

  const computedEntries = useMemo((): TCachedFile[] => {
    // Force recompute when files change
    void refreshTick;
    if (!panel.find || !panel.find.query || panel.find.query.length === 0) {
      return [];
    }
    const ruleResults: TCachedFile[][] = panel.find.query.map((r) =>
      evaluateRule(r)
    );
    const byPath = (arr: TCachedFile[]) =>
      new Set(arr.map((e) => e.file!.path));
    let combinedPaths = new Set<string>();
    const combine = panel.find.combine || "union";
    if (combine === "union") {
      for (const set of ruleResults) {
        for (const e of set) combinedPaths.add(e.file!.path);
      }
    } else if (combine === "intersect") {
      if (ruleResults.length === 0) return [];
      let current = byPath(ruleResults[0]);
      for (let i = 1; i < ruleResults.length; i++) {
        const next = byPath(ruleResults[i]);
        const inter = new Set<string>();
        current.forEach((p) => {
          if (next.has(p)) inter.add(p);
        });
        current = inter;
      }
      combinedPaths = current;
    } else if (combine === "subtract") {
      if (ruleResults.length === 0) return [];
      let current = byPath(ruleResults[0]);
      const remove = new Set<string>();
      for (let i = 1; i < ruleResults.length; i++) {
        for (const e of ruleResults[i]) remove.add(e.file!.path);
      }
      const out = new Set<string>();
      current.forEach((p) => {
        if (!remove.has(p)) out.add(p);
      });
      combinedPaths = out;
    }
    // Convert to TCachedFile, apply top-level filter and optional targetType
    const allCandidates: TCachedFile[] = [];
    combinedPaths.forEach((p) => {
      const c = fileManager.getFileByPath(p);
      if (c) allCandidates.push(c);
    });
    const filtered = allCandidates.filter((c) =>
      evalFilterExpr(c, panel.filter)
    );
    // When using advanced find DSL, respect the configured filters exactly and
    // do NOT force-narrow to targetType. This allows panels to union multiple
    // entity types (e.g., facts + ideas) for a single host.
    const hasAdvancedFind = !!panel.find && panel.find.query?.length > 0;
    if (hasAdvancedFind) {
      return uniqByPath(filtered);
    }
    // Legacy behavior: if no advanced find is provided, restrict to targetType
    // to mirror the old single-entity panel semantics.
    const onlyTarget = filtered.filter(
      (c) => getType(c) === (effectiveTargetType as string)
    );
    return uniqByPath(onlyTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    panel.find,
    panel.filter,
    evaluateRule,
    evalFilterExpr,
    getType,
    effectiveTargetType,
    refreshTick,
  ]);

  // Fallback legacy dataset gathered via useFiles hook (always call hooks)
  const legacyEntries = useFiles(effectiveTargetType, { filter: filterFn });

  const entries = useMemo(() => {
    if (panel.find && panel.find.query && panel.find.query.length > 0) {
      return computedEntries;
    }
    return legacyEntries;
  }, [panel.find, computedEntries, legacyEntries]);

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

  const badgeConfig = panel.badge ?? {};
  const badgeEnabled = badgeConfig.enabled ?? true;
  const badgeTemplate = String(badgeConfig.content ?? "{count}");

  const badgeText = useMemo(() => {
    if (!badgeEnabled) return null;
    if (!badgeTemplate) return null;

    const items = optimisticOrdered ?? ordered ?? [];
    const countValue = items.length;

    let latestDateValue = "";
    let latestTimestamp = Number.NEGATIVE_INFINITY;
    for (const entry of items) {
      const raw = getFrontmatterString(entry, "date");
      if (!raw) continue;
      const parsed = Date.parse(raw);
      if (!Number.isNaN(parsed)) {
        if (parsed > latestTimestamp) {
          latestTimestamp = parsed;
          latestDateValue = raw;
        }
        continue;
      }
      if (!latestDateValue) {
        latestDateValue = raw;
      }
    }

    let output = badgeTemplate.replace(/\{count\}/g, String(countValue));
    output = output.replace(/\{date\}/g, latestDateValue);
    if (!output.trim()) return null;
    return output;
  }, [badgeEnabled, badgeTemplate, optimisticOrdered, ordered]);

  const handleCollapseChange = useCallback(
    async (nextCollapsed: boolean) => {
      setIsCollapsed(nextCollapsed);
      if (!hostFile) return;
      // Guard: avoid writing frontmatter if the value hasn't actually changed.
      // Some containers may call onCollapseChange on mount or every render.
      // Persist only when there's a real state transition to prevent re-renders loops.
      try {
        const currentCollapsed = (file.cache?.frontmatter as any)?.mondoState?.[
          panelKey
        ]?.collapsed;
        if (currentCollapsed === nextCollapsed) {
          return;
        }
      } catch (_) {
        // If reading cache fails, proceed with best effort below.
      }
      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof (frontmatter as any).mondoState !== "object" ||
            (frontmatter as any).mondoState === null
          ) {
            (frontmatter as any).mondoState = {};
          }
          const panelState = (frontmatter as any).mondoState[panelKey];
          if (typeof panelState !== "object" || panelState === null) {
            (frontmatter as any).mondoState[panelKey] = {};
          }
          (frontmatter as any).mondoState[panelKey].collapsed = nextCollapsed;
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

  const badgeAction = useMemo(() => {
    if (!badgeText) {
      return null;
    }
    return {
      key: "badge",
      content: (
        <div className="flex min-w-0 flex-1 items-center justify-end">
          <Badge>{badgeText}</Badge>
        </div>
      ),
    };
  }, [badgeText]);

  const actionsOnCollapsed = useMemo(
    () => (badgeAction ? [badgeAction] : []),
    [badgeAction]
  );

  const actions = useMemo(() => {
    // default createEntity.enabled should be true unless explicitly disabled
    const createCfg = panel.createEntity ?? { enabled: true };
    const createEnabled = createCfg.enabled !== false;
    const items: { key: string; content: ReactNode }[] = [];

    if (badgeAction) {
      items.push(badgeAction);
    }

    if (!createEnabled) {
      return items;
    }
    // Resolve referenced create definition from entity.createRelated if requested
    const hostTypeLower = hostTypeNormalized;
    const hostEntityCfg = isMondoEntityType(hostTypeLower)
      ? (MONDO_ENTITIES[hostTypeLower] as any)
      : undefined;
    const refKey = (createCfg as any)?.referenceCreate as string | undefined;
    const referencedCreate = (() => {
      if (!refKey || !hostEntityCfg?.createRelated) return undefined;
      const list = hostEntityCfg.createRelated as Array<any>;
      const match = list.find((c) => String(c?.key || "").trim() === refKey);
      if (!match) return undefined;
      return (match.create ?? {}) as {
        title?: string;
        attributes?: Record<string, unknown>;
        linkProperties?: string | string[];
        openAfterCreate?: boolean;
      };
    })();

    // Merge referenced create settings with panel overrides
    const titleTemplate =
      createCfg.title ?? referencedCreate?.title ?? `Untitled ${defaultTitle}`;
    const mergedAttributes = (() => {
      const base = (referencedCreate?.attributes ?? {}) as Record<
        string,
        unknown
      >;
      const override = (createCfg.attributes ?? {}) as Record<string, unknown>;
      return Object.keys({ ...base, ...override }).length > 0
        ? ({ ...base, ...override } as Record<string, unknown>)
        : undefined;
    })();
    items.push({
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
                  attributeTemplates: mergedAttributes as any,
                  // link back using only hostType-specific properties (no generic "related")
                  linkProperties: buildLinkProperties(
                    hostType as MondoEntityType,
                    (panel.properties ?? panel.prop) as
                      | string
                      | string[]
                      | undefined
                  ),
                  openAfterCreate:
                    (createCfg as any)?.openAfterCreate ??
                    referencedCreate?.openAfterCreate ??
                    true,
                });
              } catch (error) {
                console.error("BacklinksLinks: failed to create entity", error);
              } finally {
                setIsCreating(false);
              }
            })();
          }}
        />
      ),
    });
    return items;
  }, [
    panel.createEntity,
    panel.properties,
    panel.prop,
    isCreating,
    app,
    file,
    effectiveTargetType,
    hostType,
    defaultTitle,
    badgeAction,
    hostTypeNormalized,
  ]);

  const panelTitle = panel.title || defaultTitle;
  // Subtitle is optional: if not provided, skip rendering
  const panelSubtitle = panel.subtitle ?? undefined;
  // Icon is optional: if not provided, skip rendering
  const panelIcon = panel.icon ?? undefined;
  const badgeLabel = badgeText ?? undefined;
  const shouldRender = ordered.length > 0 || visibility !== "notEmpty";

  const handleExpandFromSummary = useCallback(() => {
    void handleCollapseChange(false);
  }, [handleCollapseChange]);

  useEffect(() => {
    if (!shouldRender) {
      setCollapsedPanel(panelKey, null);
      return;
    }

    if (isCollapsed) {
      setCollapsedPanel(panelKey, {
        id: panelKey,
        label: panelTitle,
        icon: panelIcon,
        badgeLabel,
        onExpand: handleExpandFromSummary,
        order,
        panelType,
      });
    } else {
      setCollapsedPanel(panelKey, null);
    }

    return () => {
      setCollapsedPanel(panelKey, null);
    };
  }, [
    badgeLabel,
    handleExpandFromSummary,
    isCollapsed,
    order,
    panelIcon,
    panelKey,
    panelTitle,
    panelType,
    setCollapsedPanel,
    shouldRender,
  ]);

  // After all hooks have executed, check visibility
  if (!shouldRender) {
    return null;
  }

  return (
    <div className={isCollapsed ? "hidden" : undefined}>
      <Card
        collapsible
        collapsed={isCollapsed}
        collapseOnHeaderClick
        minimizeOnCollapsed
        icon={panelIcon}
        title={panelTitle}
        subtitle={panelSubtitle}
        actions={actions}
        actionsOnCollapsed={actionsOnCollapsed}
        onCollapseChange={handleCollapseChange}
      >
        <EntityLinksTable
          items={optimisticOrdered ?? ordered}
          getKey={(e) => e.file!.path}
          pageSize={pageSize}
          sortable={sortConfig.strategy === "manual" && sortable}
          onReorder={
            sortConfig.strategy === "manual"
              ? handleReorderImmediate
              : undefined
          }
          getSortableId={(e) => e.file!.path}
          emptyLabel={`No ${panelTitle.toLowerCase()} yet`}
          renderRow={(entry) => {
            const path = entry.file!.path;
            const show = getEntityDisplayName(entry);
            const date = getFrontmatterString(entry, "date");
            const entryFrontmatter =
              (entry.cache?.frontmatter as Record<string, unknown> | undefined) ??
              {};
            const entryTypeRaw = String(
              entryFrontmatter.mondoType ?? entryFrontmatter.type ?? ""
            ).trim();
            const entryTypeLower = entryTypeRaw.toLowerCase();
            const entryTypeIcon = isMondoEntityType(entryTypeLower)
              ? MONDO_ENTITIES[entryTypeLower as MondoEntityType]?.icon
              : undefined;
            return (
              <>
                {columns.map((col, idx) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";
                  if (col.type === "entityIcon") {
                    return (
                      <Table.Cell
                        key={`c-${idx}`}
                        className={`px-1 py-2 align-middle w-8 ${alignClass}`}
                        style={{ width: "2rem" }}
                      >
                        {entryTypeIcon ? (
                          <Icon name={entryTypeIcon} className="mx-auto" />
                        ) : (
                          <span className="inline-block w-5 h-5" />
                        )}
                      </Table.Cell>
                    );
                  }
                  if (col.type === "cover") {
                    const src = getCoverResource(app, entry);
                    return (
                      <Table.Cell
                        key={`c-${idx}`}
                        className={`px-0 py-2 align-middle w-16 ${alignClass}`}
                        style={{ width: "4rem" }}
                      >
                        {src ? (
                          <div className="flex justify-center">
                            <Cover
                              src={src}
                              alt={show}
                              size={64}
                              strategy={col.mode === "contain" ? "contain" : "cover"}
                            />
                          </div>
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
                        return (
                          <span key={`a-${i}`}>{JSON.stringify(item)}</span>
                        );
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
                      <span className="text-xs text-[var(--text-muted)]">
                        —
                      </span>
                    </Table.Cell>
                  );
                })}
              </>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default BacklinksLinks;
