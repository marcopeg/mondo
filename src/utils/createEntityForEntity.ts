import { TFile, type App } from "obsidian";
import { getMondoPlugin } from "@/utils/getMondoPlugin";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/MondoTemplates";
import { MondoFileType, isMondoEntityType } from "@/types/MondoFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import {
  buildWikiLink,
  focusAndSelectTitle,
  slugify,
} from "@/utils/createLinkedNoteHelpers";
import type { MondoEntityCreateAttributes } from "@/types/MondoEntityConfig";

export type CreateEntityForEntityParams = {
  app: App;
  targetType: string; // Mondo entity type (lowercase)
  hostEntity: TCachedFile; // current focused entity
  titleTemplate?: string; // e.g., "{date} on {show}"
  attributeTemplates?: MondoEntityCreateAttributes; // values with {date}|{datetime}|{show}
  linkProperties?: string[]; // which fm props to set with link to host (defaults to ["related", hostType])
  openAfterCreate?: boolean;
};

const formatDateParts = (now: Date) => {
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return { yyyy, yy, month, day, hour, minute };
};

const applyInlineTemplate = (
  raw: string,
  ctx: {
    dateISO: string;
    datetimeISO: string;
    hostName: string;
    parts: {
      yyyy: string;
      yy: string;
      month: string;
      day: string;
      hour: string;
      minute: string;
    };
    hostFM?: Record<string, unknown>;
  }
) => {
  const s = String(raw);
  // Handle {@this.show}: resolve to show attribute or fall back to hostName
  let out = s.replace(/\{\s*@this\.show\s*\}/gi, () => {
    const hostFM = ctx.hostFM ?? {};
    const showAttr = hostFM.show;
    if (typeof showAttr === "string" && showAttr.trim()) {
      return showAttr.trim();
    }
    // Fallback to hostName if show attribute is empty or missing
    return ctx.hostName;
  });
  // Non-ambiguous tokens (case-insensitive)
  out = out
    .replace(/\{\s*datetime\s*\}/gi, ctx.datetimeISO)
    .replace(/\{\s*date\s*\}/gi, ctx.dateISO)
    .replace(/\{\s*show\s*\}/gi, ctx.hostName)
    .replace(/\{\s*(YYYY|yyyy)\s*\}/g, ctx.parts.yyyy)
    .replace(/\{\s*(YY|yy)\s*\}/g, ctx.parts.yy)
    .replace(/\{\s*(DD|dd)\s*\}/g, ctx.parts.day)
    .replace(/\{\s*hh\s*\}/g, ctx.parts.hour)
    .replace(/\{\s*mm\s*\}/g, ctx.parts.minute);
  // Ambiguous between month/minute: treat upper-case MM as month
  out = out.replace(/\{\s*MM\s*\}/g, ctx.parts.month);
  return out;
};

/**
 * Create a new Mondo entity note of the given target type, using the configured template and root path.
 * It links back to the host entity via the provided linkProperties (defaults to ["related", hostType])
 * and applies optional attribute overrides from attributeTemplates.
 */
export const createEntityForEntity = async ({
  app,
  targetType,
  hostEntity,
  titleTemplate,
  attributeTemplates,
  linkProperties,
  openAfterCreate = true,
}: CreateEntityForEntityParams): Promise<TFile | null> => {
  const plugin = getMondoPlugin(app);
  if (!plugin) {
    console.error("createEntityForEntity: Mondo plugin instance not available");
    return null;
  }

  if (!hostEntity?.file) {
    console.warn("createEntityForEntity: missing host entity file");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<MondoFileType, string>>;
    templates?: Partial<Record<MondoFileType, string>>;
  };

  const normalizedTarget = String(targetType).trim().toLowerCase();
  if (!isMondoEntityType(normalizedTarget)) {
    console.error(`createEntityForEntity: invalid target type "${targetType}"`);
    return null;
  }

  const now = new Date();
  const { yyyy, yy, month, day, hour, minute } = formatDateParts(now);
  const dateISO = `${yyyy}-${month}-${day}`;
  const datetimeISO = now.toISOString();
  const hostName = getEntityDisplayName(hostEntity);

  const titleRaw = titleTemplate || "Untitled";
  const title =
    applyInlineTemplate(titleRaw, {
      dateISO,
      datetimeISO,
      hostName,
      parts: { yyyy, yy, month, day, hour, minute },
      hostFM: hostEntity.cache?.frontmatter as
        | Record<string, unknown>
        | undefined,
    }).trim() || "Untitled";

  const folderSetting = (
    settings.rootPaths?.[normalizedTarget as MondoFileType] ?? "/"
  ).trim();
  const normalizedFolder = normalizeFolderPath(folderSetting);

  if (normalizedFolder) {
    const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
    if (!existingFolder) {
      await app.vault.createFolder(normalizedFolder);
    }
  }

  const safeTitle = title;
  const filenameBase = safeTitle.includes(".md")
    ? safeTitle.replace(/\.md$/i, "")
    : safeTitle;
  const filename = `${filenameBase}.md`;
  const filePath = normalizedFolder
    ? `${normalizedFolder}/${filename}`
    : filename;

  const templateSource = await getTemplateForType(
    app,
    settings.templates,
    normalizedTarget as MondoFileType
  );

  const rendered = renderTemplate(templateSource, {
    title: safeTitle,
    type: normalizedTarget,
    filename,
    slug: slugify(filenameBase),
    date: datetimeISO,
    datetime: datetimeISO,
  });

  let created = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  const didExist = Boolean(created);
  if (!created) {
    created = await app.vault.create(filePath, rendered);
  }
  if (!(created instanceof TFile)) {
    return null;
  }

  const hostFile = hostEntity.file;
  // Default link properties: do NOT include a generic "related" key by default.
  // Use only the host entity type (e.g. 'person', 'company') if available.
  const defaultLinkProps = (() => {
    const hostType = String((hostEntity.cache?.frontmatter as any)?.type || "")
      .trim()
      .toLowerCase();
    const props: string[] = [];
    if (hostType) props.push(hostType);
    return props;
  })();

  // New rule: when explicit attributes are provided, DO NOT apply default
  // auto-linking (hostType backlink). Only explicit attributes should be set.
  const attributeTemplatesAny = attributeTemplates as
    | Record<string, unknown>
    | undefined;
  const hasExplicitAttributes = !!(
    attributeTemplatesAny && Object.keys(attributeTemplatesAny).length > 0
  );

  const linkProps = hasExplicitAttributes
    ? []
    : Array.isArray(linkProperties) && linkProperties.length > 0
    ? Array.from(
        new Set(linkProperties.map((s) => String(s).trim()).filter(Boolean))
      )
    : defaultLinkProps;

  // Persist frontmatter: add links and attributes
  await app.fileManager.processFrontMatter(created, (frontmatter) => {
    // Ensure type is set (template already did, but keep consistent)
    (frontmatter as any).type = normalizedTarget;

    // Link back to host
    const wiki = buildWikiLink({
      app,
      sourcePath: created!.path,
      targetFile: hostFile!,
      displayName: hostName,
    });

    const linkKeys = new Set(linkProps);

    linkProps.forEach((prop) => {
      const key = String(prop).trim();
      if (!key) return;
      const existing = (frontmatter as any)[key];
      if (Array.isArray(existing)) {
        const has = existing.some((e) => String(e).trim() === wiki);
        if (!has) existing.push(wiki);
      } else if (existing === undefined || existing === null) {
        (frontmatter as any)[key] = [wiki];
      } else {
        const val = String(existing).trim();
        const arr = val ? [val] : [];
        if (!arr.includes(wiki)) arr.push(wiki);
        (frontmatter as any)[key] = arr;
      }
    });

    // Attribute overrides
    if (attributeTemplates && typeof attributeTemplates === "object") {
      const hostFM = (hostEntity.cache?.frontmatter as any) ?? {};
      const deepClone = (val: unknown) => {
        try {
          return JSON.parse(JSON.stringify(val));
        } catch (_) {
          return val as any;
        }
      };
      Object.entries(attributeTemplates as Record<string, unknown>).forEach(
        ([k, v]) => {
          // Helper to process a single template value into a concrete value
          const processValue = (val: unknown): unknown => {
            if (typeof val === "string") {
              const m = val
                .trim()
                .match(/^\{\s*@this\s*(?:\.\s*([A-Za-z0-9_-]+)\s*)?\}$/);
              if (m) {
                const prop = m[1]?.trim();
                if (prop) {
                  const src = hostFM[prop];
                  if (src !== undefined) {
                    return deepClone(src);
                  }
                  return undefined;
                }
                // {@this} with no property: produce a wikilink to the host
                return wiki;
              }
              // Regular inline token replacement for strings
              return applyInlineTemplate(val, {
                dateISO,
                datetimeISO,
                hostName,
                parts: { yyyy, yy, month, day, hour, minute },
                hostFM: hostFM,
              });
            }
            // Preserve primitive types
            if (typeof val === "number" || typeof val === "boolean") {
              return val;
            }
            // Arrays: process each element
            if (Array.isArray(val)) {
              const outArr: unknown[] = [];
              for (const item of val) {
                const processed = processValue(item);
                if (processed === undefined) continue;
                // If a nested array was returned (e.g., copying {@this.prop} when it's an array),
                // flatten its items into the parent array to avoid double nesting.
                if (Array.isArray(processed)) {
                  outArr.push(...processed.map((x) => deepClone(x)));
                } else {
                  outArr.push(processed);
                }
              }
              return outArr;
            }
            // Fallback: deep clone objects as-is
            if (typeof val === "object" && val !== null) {
              return deepClone(val);
            }
            return val;
          };

          const processed = processValue(v);
          if (processed === undefined) return;
          // Avoid overwriting linkProps arrays if the same key is used and default linking is active
          if (linkKeys.has(k)) {
            // If processed is an array, merge ensuring uniqueness
            const existing = (frontmatter as any)[k];
            if (Array.isArray(existing) && Array.isArray(processed)) {
              const set = new Set(existing.map((e: unknown) => String(e)));
              for (const item of processed) {
                const s = String(item);
                if (!set.has(s)) existing.push(item);
              }
              (frontmatter as any)[k] = existing;
              return;
            }
            // Otherwise, let attributes take precedence over default linking
            (frontmatter as any)[k] = processed;
            return;
          }
          (frontmatter as any)[k] = processed;
        }
      );
    }
  });

  if (openAfterCreate && created instanceof TFile) {
    const leaf = app.workspace.getLeaf(false);
    await (leaf as any)?.openFile?.(created);
    // if newly created, try to focus title
    if (!didExist) {
      window.setTimeout(() => {
        try {
          focusAndSelectTitle(leaf);
        } catch (_) {
          // ignore focus errors
        }
      }, 150);
    }
  }

  return created;
};

export default createEntityForEntity;
