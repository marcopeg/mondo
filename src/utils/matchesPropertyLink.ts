import type { TFile } from "obsidian";
import type { TCachedFile } from "@/types/TCachedFile";

/**
 * Check whether a candidate file's frontmatter property contains a link
 * that points to the target file. Handles single value or array values,
 * wikilink form ([[...]]), aliasing (left side before '|'), short name (basename),
 * and long path (full path without .md). Returns true on first match.
 */
export function matchesPropertyLink(
  candidate: TCachedFile,
  propertyKey: string,
  target: TFile
) {
  const fm = candidate.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!fm) return false;

  const raw = fm[propertyKey];
  if (raw === undefined || raw === null) return false;

  const values = Array.isArray(raw) ? raw : [raw];

  const targetBasename = target.basename;
  const targetPathNoExt = target.path.replace(/\.md$/i, "");

  const normalize = (s: string) => s.replace(/\\/g, "/").trim();

  for (const v of values) {
    if (v === undefined || v === null) continue;
    const rawStr = String(v);
    // strip wikilink brackets
    let link = rawStr;
    if (link.startsWith("[[") && link.endsWith("]]")) {
      link = link.slice(2, -2);
    }
    // left side before alias |
    const left = link.split("|")[0];
    const leftNorm = normalize(left).replace(/\.md$/i, "");

    // direct basename match
    if (left === targetBasename) return true;

    // full path (no ext) match
    if (leftNorm === targetPathNoExt) return true;

    // last path segment matches basename
    const last = leftNorm.split("/").pop();
    if (last === targetBasename) return true;
  }

  return false;
}
