# ChatGPT Project: Mondo Workspace Assistant

Use this project definition when setting up a ChatGPT project dedicated to the Mondo Obsidian plugin. It summarises the plugin’s goals, data model, features, and collaboration workflows so the assistant can ideate, spec, or refine changes with full context.

## Project vision

Create a personal knowledge system inside Obsidian that behaves like a lightweight CRM/ERP. Mondo augments Markdown notes with:

- Configuration-driven entity types (people, projects, tasks, etc.).
- Dashboard views for quick capture, navigation, and analytics.
- Automations for journaling, daily logging, audio capture, and voice playback.
- Tight integration with AI tools (dictation, transcription, ChatGPT hand-off).

## Core modules

### 1. Entity Management System (EMS)
- JSON configuration stored in `mondoConfig` defines entity types, templates, link panels, and creation flows.
- Notes with matching `type` frontmatter gain custom headers, cover thumbnails, related-note buttons, and dynamic link panels.
- Dashboard tiles, relevant-note filters, and Quick Search widgets are derived from the same configuration, ensuring a consistent experience.

### 2. Dashboard & views
- `DASHBOARD_VIEW` surfaces Quick Tasks, Relevant Notes, Quick Search, entity tiles, and vault stats.
- Additional registered panes include: Entity Panel, Audio Logs, Vault Images, Vault Files, and Vault Notes.
- Markdown code blocks (triple backticks with the language `mondo`) render interactive widgets (journal navigator, habit tracker, training timers).

### 3. Audio & AI toolkit
- Whisper-based transcription of recorded audio files, with transcript files linked back to the source.
- Dictation manager for capturing voice into the active note, including a mobile-friendly toolbar.
- Voiceover generation that converts notes or selections into speech files and references them in frontmatter.
- ChatGPT integration that opens chat.openai.com pre-filled with the note content.

### 4. Daily workflows
- Daily note automation with time-stamped append commands and metadata logging via `DailyNoteTracker`.
- Journaling support: quick keyboard navigation, auto-focus mode, and view injections for previous/next entries.
- Habit tracker and timer components embedded through the inline code block renderer.

## Engineering conventions

- TypeScript + React, rendered inside Obsidian views with ReactDOM.
- Tailwind utility classes for styling; respect Obsidian theme variables.
- All stateful logic in hooks/containers, presentational logic in `src/components`.
- Configuration validated by `MondoConfigManager` before broadcasting via `setMondoConfig`.

## Key files & directories

| Area | Purpose | Location |
| --- | --- | --- |
| Plugin entry | Registers commands, views, toolbars, config handling | `src/main.ts` |
| Entities runtime | Builds entity state from config presets | `src/entities/index.ts` |
| Dashboard | React view, tiles, quick tasks/search | `src/views/dashboard-view` |
| Entity panels | Dynamic link panels + table view | `src/containers/EntityLinks`, `src/views/entity-panel-view` |
| Audio features | Transcription, dictation, voiceover | `src/utils/AudioTranscriptionManager.ts`, `src/utils/NoteDictationManager.tsx`, `src/utils/VoiceoverManager.ts` |
| Daily workflows | Daily note commands + tracker | `src/commands/daily.*`, `src/utils/DailyNoteTracker.ts` |
| Settings UI | Plugin settings tab and sections | `src/views/settings` |
| Templates | Rendering engine for entity note templates | `src/utils/MondoTemplates.ts`, `src/utils/createEntityNoteFromInput.ts` |

## Common tasks ChatGPT can assist with

1. **Config design** – Extend `mondoConfig` with new entities, dashboards, or link panels.
2. **Feature ideation** – Brainstorm UI improvements, panel types, or automations that leverage existing hooks.
3. **Workflow mapping** – Outline how commands, toolbars, and views collaborate (e.g. dictation → transcription → audio logs).
4. **Documentation upkeep** – Ensure docs like `docs/FEATURES.md`, `docs/MONDO_CONFIG.md`, or entity-specific guides stay in sync.
5. **Testing strategy** – Suggest manual testing checklists for new features (since Obsidian plugins require interactive validation).

## Guardrails

- Maintain alignment with the TypeScript & React conventions defined in `AGENTS.md`.
- When suggesting config changes, reference the validation rules described in `docs/ENTITIES_RULES_FOR_CHATGPT.md`.
- Preserve compatibility with Obsidian’s desktop and mobile environments (avoid Node-only APIs in UI code).
- Respect the plugin’s focus on Obsidian metadata; avoid solutions that require external databases.

## Brainstorming prompts

- “Design a new entity type for conference sessions that links speakers, locations, and follow-up tasks. Update the config and list the UI implications.”
- “Propose improvements to the Quick Tasks dashboard card that surface due dates and assignees.”
- “Outline an onboarding checklist for enabling dictation, transcription, and voiceover features using a fresh API key.”
- “Spec a new EntityLinks panel that summarises recent logs for a project, including creation actions.”

## Deliverable expectations

- For configuration updates: respond with a full JSON block, matching the system prompt in `docs/ENTITIES_RULES_FOR_CHATGPT.md`.
- For documentation tasks: produce Markdown aligned with the existing tone and include file path references.
- For code suggestions: provide TypeScript/TSX snippets that respect the component structure and hook conventions.

Set ChatGPT’s project description to this document so the assistant is aware of the plugin’s architecture, goals, and boundaries before collaborating on new ideas.
