import { App, TFile } from "obsidian";
import { CRMFileType } from "@/types/CRMFileType";
import { getDefaultTemplate } from "@/templates";

export interface TemplateContext {
  title: string;
  type: string;
  filename: string;
  slug: string;
  date: string;
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

type ParsedDate = {
  date: Date | null;
  isDateOnly: boolean;
};

const parseDateValue = (raw: string): ParsedDate => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { date: null, isDateOnly: false };
  }

  const isoDateOnlyMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoDateOnlyMatch) {
    const [year, month, day] = trimmed.split("-").map(Number);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(utcDate.getTime())) {
        return { date: utcDate, isDateOnly: true };
      }
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return { date: parsed, isDateOnly: false };
  }

  return { date: null, isDateOnly: false };
};

const formatDateTime = (isoString: string, format: string): string => {
  const { date } = parseDateValue(isoString);
  if (!date) {
    return format;
  }

  return format.replace(DATE_FORMAT_TOKENS, (token) => {
    const formatter = tokenFormatters[token];
    return formatter ? formatter(date) : token;
  });
};

const getTemplateReplacement = (
  pattern: RegExp,
  getValue: (context: TemplateContext) => string
) => {
  return (content: string, context: TemplateContext): string =>
    content.replace(pattern, () => getValue(context));
};

const TEMPLATE_REPLACEMENTS = [
  getTemplateReplacement(/{{\s*title\s*}}/gi, (context) => context.title),
  getTemplateReplacement(/{{\s*type\s*}}/gi, (context) => context.type),
  getTemplateReplacement(/{{\s*filename\s*}}/gi, (context) => context.filename),
  getTemplateReplacement(/{{\s*slug\s*}}/gi, (context) => context.slug),
  getTemplateReplacement(/{{\s*date\s*}}/gi, (context) => context.date),
  // Backwards compatibility: {{datetime}} maps to the unified date field
  getTemplateReplacement(/{{\s*datetime\s*}}/gi, (context) => context.date),
  // Backwards compatibility: {{time}} renders from the unified date field when possible
  getTemplateReplacement(/{{\s*time\s*}}/gi, (context) => {
    const parsed = parseDateValue(context.date);
    if (!parsed.date) {
      return context.date;
    }
    return `${pad(parsed.date.getUTCHours())}:${pad(parsed.date.getUTCMinutes())}`;
  }),
];

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
  TEMPLATE_REPLACEMENTS.forEach((applyReplacement) => {
    output = applyReplacement(output, context);
  });
  output = output.replace(
    /{{\s*(date|time|datetime)\s*:\s*([^}]+)\s*}}/gi,
    (_match, token, rawFormat) => {
      const normalizedToken = String(token || "date").toLowerCase();
      const format = String(rawFormat || "").trim();
      if (!format) {
        if (normalizedToken === "time") {
          const parsed = parseDateValue(context.date);
          if (parsed.date) {
            return `${pad(parsed.date.getUTCHours())}:${pad(
              parsed.date.getUTCMinutes()
            )}`;
          }
        }
        return context.date;
      }
      return formatDateTime(context.date, format);
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
