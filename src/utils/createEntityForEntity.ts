import { TFile, type App } from "obsidian";
import { getCRMPlugin } from "@/utils/getCRMPlugin";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";
import { getTemplateForType, renderTemplate } from "@/utils/CRMTemplates";
import { CRMFileType, isCRMEntityType } from "@/types/CRMFileType";
import type { TCachedFile } from "@/types/TCachedFile";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import {
  buildWikiLink,
  focusAndSelectTitle,
  slugify,
} from "@/utils/createLinkedNoteHelpers";

export type CreateEntityAttributes = Record<string, string | number | boolean>;

export type CreateEntityForEntityParams = {
  app: App;
  targetType: string; // CRM entity type (lowercase)
  hostEntity: TCachedFile; // current focused entity
  titleTemplate?: string; // e.g., "{date} on {show}"
  attributeTemplates?: CreateEntityAttributes; // values with {date}|{datetime}|{show}
  linkProperties?: string[]; // which fm props to set with link to host (defaults to ["related", hostType])
  openAfterCreate?: boolean;
};

const formatDateParts = (now: Date) => {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return { yyyy, mm, dd, hh, min };
};

const applyInlineTemplate = (
  raw: string,
  ctx: { dateISO: string; datetimeISO: string; hostName: string }
) => {
  return String(raw)
    .replace(/\{\s*datetime\s*\}/gi, ctx.datetimeISO)
    .replace(/\{\s*date\s*\}/gi, ctx.dateISO)
    .replace(/\{\s*show\s*\}/gi, ctx.hostName);
};

/**
 * Create a new CRM entity note of the given target type, using the configured template and root path.
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
  const plugin = getCRMPlugin(app);
  if (!plugin) {
    console.error("createEntityForEntity: CRM plugin instance not available");
    return null;
  }

  if (!hostEntity?.file) {
    console.warn("createEntityForEntity: missing host entity file");
    return null;
  }

  const settings = plugin.settings as {
    rootPaths?: Partial<Record<CRMFileType, string>>;
    templates?: Partial<Record<CRMFileType, string>>;
  };

  const normalizedTarget = String(targetType).trim().toLowerCase();
  if (!isCRMEntityType(normalizedTarget)) {
    console.error(`createEntityForEntity: invalid target type "${targetType}"`);
    return null;
  }

  const now = new Date();
  const { yyyy, mm, dd, hh, min } = formatDateParts(now);
  const dateISO = `${yyyy}-${mm}-${dd}`;
  const datetimeISO = now.toISOString();
  const hostName = getEntityDisplayName(hostEntity);

  const titleRaw = titleTemplate || "Untitled";
  const title =
    applyInlineTemplate(titleRaw, { dateISO, datetimeISO, hostName }).trim() ||
    "Untitled";

  const folderSetting = (
    settings.rootPaths?.[normalizedTarget as CRMFileType] ?? "/"
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
    normalizedTarget as CRMFileType
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

  const linkProps =
    Array.isArray(linkProperties) && linkProperties.length > 0
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
      Object.entries(attributeTemplates).forEach(([k, v]) => {
        if (typeof v === "string") {
          const m = v
            .trim()
            .match(/^\{\s*@this\s*(?:\.\s*([A-Za-z0-9_-]+)\s*)?\}$/);
          if (m) {
            const prop = m[1]?.trim();
            if (prop) {
              const src = hostFM[prop];
              if (src !== undefined) {
                (frontmatter as any)[k] = deepClone(src);
              }
              return;
            }
            // {@this} with no property: set a link to the host note
            // Avoid overwriting linkProps arrays if the same key is used
            if (!linkKeys.has(k)) {
              (frontmatter as any)[k] = wiki;
            }
            return;
          }
        }
        // Fallback to regular inline token replacement
        const renderedValue = applyInlineTemplate(String(v), {
          dateISO,
          datetimeISO,
          hostName,
        });
        (frontmatter as any)[k] = renderedValue;
      });
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
