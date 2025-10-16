import { App, TFile } from "obsidian";
import { CRMFileType } from "@/types/CRMFileType";
import { getDefaultTemplate } from "@/templates";

const TEMPLATE_KEYS: Array<[RegExp, keyof TemplateContext]> = [
  [/{{\s*title\s*}}/gi, "title"],
  [/{{\s*type\s*}}/gi, "type"],
  [/{{\s*filename\s*}}/gi, "filename"],
  [/{{\s*slug\s*}}/gi, "slug"],
  [/{{\s*date\s*}}/gi, "date"],
  [/{{\s*time\s*}}/gi, "time"],
  [/{{\s*datetime\s*}}/gi, "datetime"],
];

export interface TemplateContext {
  title: string;
  type: string;
  filename: string;
  slug: string;
  date: string;
  time: string;
  datetime: string;
}

const DATE_FORMAT_TOKENS = /(YYYY|MM|DD|HH|mm|ss)/g;

const pad = (value: number): string => value.toString().padStart(2, "0");

const tokenFormatters: Record<string, (date: Date) => string> = {
  YYYY: (date) => String(date.getUTCFullYear()),
  MM: (date) => pad(date.getUTCMonth() + 1),
  DD: (date) => pad(date.getUTCDate()),
  HH: (date) => pad(date.getUTCHours()),
  mm: (date) => pad(date.getUTCMinutes()),
  ss: (date) => pad(date.getUTCSeconds()),
};

const formatDateTime = (isoString: string, format: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return format;
  }

  return format.replace(DATE_FORMAT_TOKENS, (token) => {
    const formatter = tokenFormatters[token];
    return formatter ? formatter(date) : token;
  });
};

const ensureTemplate = (type: CRMFileType): string => getDefaultTemplate(type);

export const getTemplateForType = async (
  app: App,
  templates: Partial<Record<CRMFileType, string>> | undefined,
  type: CRMFileType
): Promise<string> => {
  const userTemplate = templates?.[type];

  if (typeof userTemplate === "string") {
    const rawTemplate = userTemplate;

    if (
      rawTemplate.includes("\n") ||
      rawTemplate.includes("{{") ||
      rawTemplate.includes("---")
    ) {
      return rawTemplate;
    }

    const trimmed = rawTemplate.trim();
    if (trimmed.length > 0) {
      const lookupPath =
        trimmed.endsWith(".md") || trimmed.endsWith(".MD")
          ? trimmed
          : `${trimmed}.md`;

      const candidate = app.vault.getAbstractFileByPath(trimmed);
      const candidateWithExt =
        candidate instanceof TFile
          ? candidate
          : (app.vault.getAbstractFileByPath(lookupPath) as TFile | null);

      if (candidateWithExt instanceof TFile) {
        try {
          return await app.vault.cachedRead(candidateWithExt);
        } catch (error) {
          console.error(
            `CRM: failed to read template file at "${candidateWithExt.path}"`,
            error
          );
        }
      } else {
        console.warn(
          `CRM: template note "${trimmed}" was not found; falling back to default template.`
        );
      }
    }
  }

  return ensureTemplate(type);
};

const extractFrontmatter = (content: string): { fm: string; body: string } => {
  if (!content.startsWith("---")) {
    return { fm: "", body: content };
  }

  const endIndex = content.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { fm: content, body: "" };
  }

  const fmSection = content.slice(0, endIndex + 4);
  const bodySection = content.slice(endIndex + 4);
  return { fm: fmSection, body: bodySection };
};

const sanitizeFrontmatter = (fm: string): string => {
  if (!fm.trim()) return "";

  const lines = fm
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines[0] === "---") {
    lines.shift();
  }
  if (lines[lines.length - 1] === "---") {
    lines.pop();
  }

  const seen = new Set<string>();

  const filtered = lines.filter((line) => {
    const match = line.match(/^(\w[\w-]*)(?=\s*:)/);
    const key = match ? match[1].toLowerCase() : null;

    if (!key) return true;

    if (key === "type" || key === "show") {
      return false;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return filtered.join("\n");
};

export const renderTemplate = (
  rawTemplate: string,
  context: TemplateContext
): string => {
  const trimmed = rawTemplate.replace(/^[\s\n\r]+/, "");
  const templateWithFence = trimmed.startsWith("---")
    ? trimmed
    : `---\n${trimmed}`;

  const { fm, body } = extractFrontmatter(templateWithFence);
  const cleanFrontmatter = sanitizeFrontmatter(fm);

  const header = ["---", `type: {{type}}`]
    .concat(cleanFrontmatter ? [cleanFrontmatter] : [])
    .concat("---")
    .join("\n");

  const combined = `${header}${body}`;

  let output = combined;
  TEMPLATE_KEYS.forEach(([pattern, key]) => {
    output = output.replace(pattern, context[key]);
  });
  output = output.replace(
    /{{\s*(date|time)\s*:\s*([^}]+)\s*}}/gi,
    (_match, token, rawFormat) => {
      const format = String(rawFormat || "").trim();
      if (!format) {
        return token === "time" ? context.time : context.date;
      }
      return formatDateTime(context.datetime, format);
    }
  );

  if (!output.endsWith("\n")) {
    output = `${output}\n`;
  }

  const { fm: renderedFm, body: renderedBody } = extractFrontmatter(output);
  const finalFrontmatter = sanitizeFrontmatter(renderedFm);

  const headerLines = ["---", `type: ${context.type}`];

  if (finalFrontmatter) {
    headerLines.push(...finalFrontmatter.split(/\r?\n/));
  }

  headerLines.push("---");

  const finalHeader = headerLines.join("\n");
  const finalContent = `${finalHeader}${renderedBody}`;

  return finalContent.endsWith("\n") ? finalContent : `${finalContent}\n`;
};
