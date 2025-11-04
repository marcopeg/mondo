# 📆 How to Work with the Daily Note

Mondo's Daily Note tooling gives you a single rolling log that is always ready for quick capture. 

Daily Notes not only creates the correct file for the day, it also maintains time-stamped sections, lets you speak or record entries hands‑free, and automatically tracks which notes you touched. Follow this guide to master every command and setting involved in the workflow.

## 1. Launch the daily note for today

1. Open the command palette and run: `Open Daily Note`
2. Mondo creates the note if it is missing, using the configured folder (defaults to `Daily/`) and filename format (defaults to `YYYY-MM-DD.md`).
3. If the note is already open in another pane, Mondo reveals that tab; otherwise it opens a new editor with the note in focus.

> Tip: the command also creates the daily folder the first time you run it, so you can start with an empty vault.

## 2. Append a new Log entry

1. Open the command palette and run:  `Append to Daily Note`
2. Mondo ensures the file exists and injects a frontmatter block containing `mondoType: daily-note` and today’s ISO `date`. Existing notes with the legacy type are upgraded automatically.
3. The plugin looks for today’s time heading (default format `## HH:MM`). If it finds one it places the cursor on the first blank line after it; if not, it creates the heading for you.
4. By default the cursor is positioned on a bullet (`- `) ready for typing. Toggle bullets off in the settings if you prefer plain paragraphs.
5. Start typing your update. When you press Enter, the editor stays inside the section so you can continue the log.

### Auto-appending text from other features

Some quick-capture flows call the same underlying command with preset text—Mondo splits multi-line snippets intelligently and keeps follow-up lines indented. When the feature asks for a task entry, the first bullet is formatted as `[ ] Task name`, so you can check it off later.

## 3. Capture voice and audio without leaving the note

- **Talk to Daily Note** runs the same setup as **Append to Daily note** and immediately starts dictation. Stop recording to drop the transcribed text into the active bullet.
- **Record to Daily Note** appends a new section, starts an inline microphone recording, saves the audio file under `audio/` (for example `audio/Recording 2024-04-12 09.15.27.webm`), and embeds the clip at your cursor.
- Click anywhere in Obsidian to finish the recording early; otherwise it stops after five minutes.

Both voice commands require microphone access. Dictation also needs your OpenAI credentials configured in the plugin’s settings.

## 4. Configure where notes live and how they look

Open **Settings → Community Plugins → Mondo → Daily Logs** to tailor the workflow:

| Setting | What it controls |
| --- | --- |
| **Daily root** | Folder that stores the notes. Use `/` to keep them in the vault root or supply any nested path. |
| **Entry format** | Filename template using `YYYY`, `MM`, and `DD`. Example: `YYYY/MM/YYYY-MM-DD` stores notes in subfolders per year. |
| **Section Level** | Heading level (`h1`–`h6`) used for each time block. |
| **Section Title** | Time template for headings. `HH` is hours (24h clock) and `mm` maps to minutes. |
| **Use bullets for entries** | Toggle whether new entries start with `- `. Disable it if you prefer free-form text blocks. |

Changes apply the next time you run one of the daily commands.

## 5. Review the automatic activity log

Every time you create, modify, or open any other note, Mondo logs it back into the current daily note:

- Frontmatter gains a `mondoState` map with `created`, `changed`, and `opened` lists populated with wiki-links to those files.
- When you view the daily note, the right-hand panel shows **Created Today**, **Changed Today**, and **Opened Today** cards so you can jump back to the notes you touched.
- Links are deduplicated automatically, and files that live outside of the daily note folder are included as long as they are not daily or journal notes themselves.

This audit trail makes it easy to reconstruct your day or find work-in-progress files later.

## 6. Troubleshooting and pro tips

- **Nothing happens when appending.** Confirm the active pane is a Markdown editor—canvas and non-note views cannot receive text.
- **Headings do not match my schedule.** Update the **Section Level** and **Section Title** settings; the command will retrofit the next entry.
- **Need multiple captures per minute.** Run **Append to Daily note** again; Mondo reuses the same heading and adds another bullet beneath it.
- **Migrating existing notes.** Running any daily command on a legacy note rewrites the frontmatter to the new format without touching the rest of the content.
- **Keep the folder tidy.** Because the commands auto-create the root folder and files, you can archive or rename past notes manually without breaking the workflow—Mondo will recreate the structure on demand.
