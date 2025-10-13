import { App, TFile, TFolder, MarkdownView } from "obsidian";
import type CRM from "@/main";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(format: string, date: Date) {
  // treat MM as minutes if HH present, otherwise ignore clash
  return format
    .split("HH")
    .join(pad(date.getHours()))
    .split("mm")
    .join(pad(date.getMinutes()))
    .split("MM")
    .join(pad(date.getMinutes()));
}

// Open (and create if needed) today's journal file inside the configured journal folder
export async function openJournal(app: App, plugin: CRM) {
  const settings = (plugin as any).settings || {};
  const journalSettings = settings.journal || {
    root: "Journal",
    entry: "YYYY-MM-DD",
  };
  const folderSetting = journalSettings.root || "Journal";
  const entryFormat = journalSettings.entry || "YYYY-MM-DD";

  // Normalize folder path: remove leading/trailing slashes, except root '/'
  const normalizedFolder =
    folderSetting === "/" ? "" : folderSetting.replace(/^\/+|\/+$/g, "");

  // Ensure the folder exists (skip if root)
  try {
    if (normalizedFolder !== "") {
      const existing = app.vault.getAbstractFileByPath(normalizedFolder);
      if (!existing) {
        await app.vault.createFolder(normalizedFolder);
      }
    }
  } catch (e) {
    // If folder creation fails, rethrow so caller can surface it
    throw e;
  }

  // Compose today's filename according to entryFormat (support YYYY, MM, DD)
  const now = new Date();
  const tokens: Record<string, string> = {
    YYYY: String(now.getFullYear()),
    MM: String(now.getMonth() + 1).padStart(2, "0"),
    DD: String(now.getDate()).padStart(2, "0"),
  };

  let fileName = entryFormat;
  for (const [k, v] of Object.entries(tokens)) {
    fileName = fileName.split(k).join(v);
  }
  if (!fileName.endsWith(".md")) fileName = `${fileName}.md`;
  const filePath = normalizedFolder
    ? `${normalizedFolder}/${fileName}`
    : fileName;

  // Ensure file exists
  let tfile = app.vault.getAbstractFileByPath(filePath) as TFile | null;
  // Build today's date in YYYY-MM-DD (standard) format for frontmatter
  const today = new Date();
  const isoDate = `${String(today.getFullYear())}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const makeFrontmatter = (dateStr: string) => {
    return `---\n` + `type: journal\n` + `date: ${dateStr}\n` + `---\n`;
  };

  if (!tfile) {
    // create with the required frontmatter at the top
    tfile = await app.vault.create(filePath, makeFrontmatter(isoDate));
  } else {
    // Ensure existing file has no crm fragment at top and has normalized frontmatter
    try {
      const raw = await app.vault.read(tfile);

      // Remove any leading crm fragment block if present
      const fragmentRegex = /^\s*```crm\njournal-nav\n```\r?\n?/;
      let cleaned = raw.replace(fragmentRegex, "");

      // Detect YAML frontmatter at the top
      const fmRegex = /^\s*---\n([\s\S]*?)\n---\r?\n?/;
      const fmMatch = cleaned.match(fmRegex);

      if (fmMatch) {
        const existingFm = fmMatch[1] || "";
        const hasTypeJournal = /(^|\n)\s*type\s*:\s*journal(\s|$)/i.test(
          existingFm
        );
        const hasTodayDate =
          /(^|\n)\s*date\s*:\s*\d{4}-\d{2}-\d{2}(\s|$)/i.test(existingFm);

        // If frontmatter already has type: journal and today's date, do nothing.
        if (
          hasTypeJournal &&
          hasTodayDate &&
          existingFm.indexOf(isoDate) !== -1
        ) {
          // nothing to do
        } else {
          // Replace existing frontmatter with normalized frontmatter
          const rest = cleaned.replace(fmRegex, "").replace(/^\r?\n+/, "");
          const newContent = makeFrontmatter(isoDate) + rest;
          await app.vault.modify(tfile, newContent);
        }
      } else {
        // No frontmatter: prepend it (strip leading newlines from original content)
        const rest = cleaned.replace(/^\r?\n+/, "");
        const newContent = makeFrontmatter(isoDate) + rest;
        await app.vault.modify(tfile, newContent);
      }
    } catch (e) {
      // ignore read/modify errors
    }
  }

  // If the file is already open in a leaf, reveal that leaf instead of opening a duplicate.
  // Additionally, if any tab is open on a journal note (matching the configured entry pattern),
  // open today's note in that same tab (replace the content shown there) so the user stays in the same leaf.
  const markdownLeaves = app.workspace.getLeavesOfType("markdown");

  const existingLeaf = markdownLeaves.find((l) => {
    try {
      const f = (l.view as any)?.file as TFile | undefined | null;
      return f?.path === filePath;
    } catch (e) {
      return false;
    }
  });

  // Find any leaf that looks like a journal entry tab (by folder and filename pattern).
  const journalLeaf = markdownLeaves.find((l) => {
    try {
      const f = (l.view as any)?.file as TFile | undefined | null;
      if (!f) return false;
      const path = f.path;
      const basename = path.split("/").pop() || path;

      // Ensure the file is inside the configured journal folder (if one is set).
      const inFolder =
        normalizedFolder === ""
          ? true
          : path.startsWith(normalizedFolder + "/");
      if (!inFolder) return false;

      // Build a filename regex from the entryFormat (YYYY -> \d{4}, MM -> \d{2}, DD -> \d{2}).
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = esc(entryFormat)
        .replace(/YYYY/g, "\\d{4}")
        .replace(/MM/g, "\\d{2}")
        .replace(/DD/g, "\\d{2}");
      const re = new RegExp("^" + pattern + "(?:\\.md)?$");
      return re.test(basename);
    } catch (e) {
      return false;
    }
  });

  let leaf =
    (existingLeaf as any) ??
    (journalLeaf as any) ??
    app.workspace.getLeaf(true);

  if (journalLeaf && !existingLeaf) {
    // A journal tab is open (but not today's file): open today's file in that same leaf.
    await (journalLeaf as any).openFile(tfile as TFile);
    app.workspace.revealLeaf(journalLeaf);
  } else if (existingLeaf) {
    // Today's file is already open in a leaf: reveal it.
    app.workspace.revealLeaf(existingLeaf);
  } else {
    // No journal tabs: open in a new (or focused) leaf as before.
    await leaf.openFile(tfile as TFile);
  }

  // Move cursor to end of file in the editor if it's a MarkdownView
  try {
    const view = leaf.view as unknown as MarkdownView | null;
    if (view && view.editor) {
      const editor = view.editor;
      const content = editor.getValue() || "";

      const useSections = (journalSettings as any).useSections ?? false;

      if (!useSections) {
        // Default behavior: ensure file ends with exactly two newlines: one separator and one editable empty line
        const trimmed = content.replace(/\n*$/, "");
        const desired = trimmed + "\n\n";
        if (desired !== content) {
          editor.setValue(desired);
        }
        const final = editor.getValue();
        const lines = final.split(/\n/);
        // Cursor on the last empty line after the separator
        const cursorLine = Math.max(0, lines.length - 1);
        editor.setCursor({ line: cursorLine, ch: 0 });
        editor.focus();
      } else {
        // Sections mode
        const noteFormat = journalSettings.note || "HH:MM";
        const sectionSetting = (journalSettings.section || "h3").toLowerCase();

        const lines = content.split(/\n/);

        const now = new Date();
        const headingText = formatTime(noteFormat, now);

        const findSectionEnd = (startIndex: number) => {
          for (let i = startIndex + 1; i < lines.length; i++) {
            if (/^#\s+/.test(lines[i])) return i - 1;
          }
          return lines.length - 1;
        };

        if (sectionSetting === "inline") {
          // Inline mode: prefer existing heading or inline part; otherwise insert a new line with "HH:MM - "
          const token = `${headingText} - `;
          // Search for existing heading matching the time or an inline token
          let foundHeadingIndex = -1;
          let foundInlineIndex = -1;
          let foundInlineCh = 0;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? "";
            // check headings H1..H6 exact match
            for (let h = 1; h <= 6; h++) {
              if (line.trim() === `${"#".repeat(h)} ${headingText}`) {
                foundHeadingIndex = i;
                break;
              }
            }
            if (foundHeadingIndex >= 0) break;
            const idx = line.indexOf(`${headingText} -`);
            if (idx !== -1 && foundInlineIndex === -1) {
              foundInlineIndex = i;
              // position after the token plus trailing space if present
              foundInlineCh =
                idx +
                `${headingText} -`.length +
                (line[idx + `${headingText} -`.length] === " " ? 1 : 0);
            }
          }

          if (foundHeadingIndex >= 0) {
            // Existing heading: place cursor on a new line after the section
            const sectionEnd = findSectionEnd(foundHeadingIndex);
            const lastLineIndex = sectionEnd;
            const lastLineText = lines[lastLineIndex] ?? "";
            const insertCh = lastLineText.length;
            editor.replaceRange("\n", { line: lastLineIndex, ch: insertCh });
            editor.setCursor({ line: lastLineIndex + 1, ch: 0 });
            editor.focus();
          } else if (foundInlineIndex >= 0) {
            // Existing inline token: move cursor to the end of that inline section
            const lineText = lines[foundInlineIndex] ?? "";
            const tokenStr = `${headingText} -`;
            const tokenPos = lineText.indexOf(tokenStr);
            const afterToken = tokenPos >= 0 ? tokenPos + tokenStr.length : 0;
            // Determine last non-space character after the token
            const rest = lineText.slice(afterToken);
            const lastNonSpaceOffset = rest.replace(/\s+$/, "").length;
            const lastNonSpacePos = afterToken + lastNonSpaceOffset;
            // Position: one space after lastNonSpacePos
            const hasSpaceAfter =
              lineText.length > lastNonSpacePos &&
              lineText[lastNonSpacePos] === " ";
            if (lastNonSpaceOffset === 0) {
              // No content after token: ensure a single space and place cursor after it
              editor.replaceRange(" ", {
                line: foundInlineIndex,
                ch: afterToken,
              });
              editor.setCursor({ line: foundInlineIndex, ch: afterToken + 1 });
            } else {
              if (hasSpaceAfter) {
                editor.setCursor({
                  line: foundInlineIndex,
                  ch: lastNonSpacePos + 1,
                });
              } else {
                // Insert a space after the content
                editor.replaceRange(" ", {
                  line: foundInlineIndex,
                  ch: lastNonSpacePos,
                });
                editor.setCursor({
                  line: foundInlineIndex,
                  ch: lastNonSpacePos + 1,
                });
              }
            }
            editor.focus();
          } else {
            // Not found: append a new line with the token and put cursor after it
            const insertPosLine = lines.length;
            const needsNewline =
              insertPosLine !== 0 &&
              (lines[insertPosLine - 1] ?? "").length > 0;
            const insertText = `${needsNewline ? "\n" : ""}${token}`;
            editor.replaceRange(insertText, { line: insertPosLine, ch: 0 });
            const targetLine = insertPosLine + (needsNewline ? 1 : 0);
            editor.setCursor({ line: targetLine, ch: token.length });
            editor.focus();
          }
        } else {
          // Heading-style sections (h1..h6)
          const match = sectionSetting.match(/^h([1-6])$/);
          const level = match ? Math.max(1, Math.min(6, Number(match[1]))) : 3;
          const prefix = "#".repeat(level);
          const headingLine = `${prefix} ${headingText}`;

          // Find existing heading line that exactly matches
          let foundIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === headingLine) {
              foundIndex = i;
              break;
            }
          }

          if (foundIndex >= 0) {
            // Place cursor on a new line after the existing section
            const sectionEnd = findSectionEnd(foundIndex);
            const lastLineIndex = sectionEnd;
            const lastLineText = lines[lastLineIndex] ?? "";
            const insertCh = lastLineText.length;
            editor.replaceRange("\n", { line: lastLineIndex, ch: insertCh });
            editor.setCursor({ line: lastLineIndex + 1, ch: 0 });
            editor.focus();
          } else {
            // Not found: append heading and place cursor on the new empty line after it
            let lastHeading = -1;
            for (let i = 0; i < lines.length; i++) {
              if (/^#\s+/.test(lines[i])) lastHeading = i;
            }
            const insertPosLine =
              lastHeading >= 0 ? findSectionEnd(lastHeading) + 1 : lines.length;
            const prependNewline = insertPosLine !== 0;
            const insertText = `${prependNewline ? "\n" : ""}${headingLine}\n`;
            editor.replaceRange(insertText, { line: insertPosLine, ch: 0 });
            const targetLine = insertPosLine + (prependNewline ? 2 : 1);
            editor.setCursor({ line: targetLine, ch: 0 });
            editor.focus();
          }
        }
      }

      // Try to center the cursor vertically in the viewport for comfortable writing
      try {
        const cursorPos = (editor as any).getCursor
          ? (editor as any).getCursor()
          : null;
        if (cursorPos && typeof (editor as any).scrollIntoView === "function") {
          (editor as any).scrollIntoView(cursorPos, true);
        } else if ((view as any).containerEl) {
          const cursorCoords = (editor as any).cursorCoords
            ? (editor as any).cursorCoords(true)
            : null;
          const scroller = (view as any).containerEl.querySelector?.(
            ".cm-scroller, .CodeMirror-scroll"
          );
          if (cursorCoords && scroller) {
            const sc = scroller as HTMLElement;
            const middle = sc.clientHeight / 2;
            sc.scrollTop = Math.max(0, cursorCoords.top - middle + 10);
          }
        }
      } catch (e) {
        // ignore scroll failures
      }
    }
  } catch (e) {
    // ignore editor positioning failures
  }
}
