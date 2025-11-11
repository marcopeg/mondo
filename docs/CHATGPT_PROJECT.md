# ChatGPT Project: Mondo Workspace Assistant

Use this project definition when setting up a ChatGPT project dedicated to the Mondo Obsidian plugin. It summarises the plugin's goals, data model, features, and collaboration workflows so the assistant can ideate, spec, or refine changes with full context.

## Project vision

Create a personal knowledge system inside Obsidian that behaves like a lightweight IMS/ERP. Mondo augments Markdown notes with:

- Configuration-driven entity types (people, projects, tasks, etc.).
- Dashboard views for quick capture, navigation, and analytics.
- Automations for journaling, daily logging, audio capture, and voice playback.
- Tight integration with AI tools (dictation, transcription, ChatGPT hand-off).

## Core modules

### 1. Entity Management System (EMS)
- JSON configuration stored in `mondoConfig` defines entity types, templates, link panels, and creation flows.
- Notes with matching `mondoType` frontmatter gain custom headers, cover thumbnails, related-note buttons, and dynamic link panels.
- Dashboard tiles, relevant-note filters, and Quick Search widgets are derived from the same configuration, ensuring a consistent experience.
- Configuration is validated by `MondoConfigManager` (`src/utils/MondoConfigManager.ts`) before being applied.
- Two preset configurations are available: `full` (comprehensive IMS with 22 entity types) and `mini` (minimal setup with person, company, task).

### 2. Dashboard & views
- `DASHBOARD_VIEW` surfaces Quick Tasks, Relevant Notes, Quick Search, entity tiles, and vault stats.
- Additional registered panes include: Entity Panel, Audio Notes, Images, Files, and Markdown Notes.
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
| Entity presets | Full and mini preset configurations | `src/entities/full/`, `src/entities/mini/` |
| Config validation | Validates and normalizes config JSON | `src/utils/MondoConfigManager.ts` |
| Dashboard | React view, tiles, quick tasks/search | `src/views/dashboard-view` |
| Entity panels | Dynamic link panels + table view | `src/containers/EntityLinks`, `src/views/entity-panel-view` |
| Audio features | Transcription, dictation, voiceover | `src/utils/AudioTranscriptionManager.ts`, `src/utils/NoteDictationManager.tsx`, `src/utils/VoiceoverManager.ts` |
| Daily workflows | Daily note commands + tracker | `src/commands/daily.*`, `src/utils/DailyNoteTracker.ts` |
| Settings UI | Plugin settings tab and sections | `src/views/settings` |
| Templates | Rendering engine for entity note templates | `src/utils/MondoTemplates.ts`, `src/utils/createEntityNoteFromInput.ts` |
| Type definitions | Entity config types and schemas | `src/types/MondoEntityConfig.ts`, `src/types/MondoEntityTypes.ts` |

## Common tasks ChatGPT can assist with

1. **Config design** – Extend `mondoConfig` with new entities, dashboards, or link panels.
2. **Feature ideation** – Brainstorm UI improvements, panel types, or automations that leverage existing hooks.
3. **Workflow mapping** – Outline how commands, toolbars, and views collaborate (e.g. dictation → transcription → audio logs).
4. **Documentation upkeep** – Ensure docs like `docs/FEATURES.md`, `docs/MONDO_CONFIG.md`, or entity-specific guides stay in sync.
5. **Testing strategy** – Suggest manual testing checklists for new features (since Obsidian plugins require interactive validation).
6. **Entity creation** – Design new entity types with appropriate templates, list columns, link panels, and creation flows.
7. **Backlinks configuration** – Set up complex relationship queries using the `find` DSL for indirect relationships.
8. **Template design** – Create entity templates with proper frontmatter structure and template tokens.

## Guardrails

- Maintain alignment with the TypeScript & React conventions defined in `AGENTS.md`.
- When suggesting config changes, reference the validation rules described in `docs/ENTITIES_RULES_FOR_CHATGPT.md`.
- Preserve compatibility with Obsidian's desktop and mobile environments (avoid Node-only APIs in UI code).
- Respect the plugin's focus on Obsidian metadata; avoid solutions that require external databases.

## Brainstorming prompts

- "Design a new entity type for conference sessions that links speakers, locations, and follow-up tasks. Update the config and list the UI implications."
- "Propose improvements to the Quick Tasks dashboard card that surface due dates and assignees."
- "Outline an onboarding checklist for enabling dictation, transcription, and voiceover features using a fresh API key."
- "Spec a new EntityLinks panel that summarises recent logs for a project, including creation actions."
- "Create a complete entity configuration for a 'Course' type with students, modules, and assessments."
- "Design a backlinks query that finds all teammates of a person (people who share the same company and team)."
- "Build an entity type for tracking books with reading status, notes, and related ideas."

## Essential documentation references

When working with Mondo IMS configuration, always consult these key documents:

- **`docs/ENTITIES_RULES_FOR_CHATGPT.md`** – Contains the complete system prompt for config generation, including validation rules and response contract.
- **`docs/MONDO_CONFIG.md`** – Comprehensive guide to configuration schema, validation, and runtime behavior.
- **`docs/ENTITY_LINKS.md`** – Step-by-step guide for adding custom panel components to entity notes.
- **`docs/BACKLINKS_PANEL.md`** – Detailed documentation for the backlinks panel configuration, query DSL, and filter syntax.
- **`docs/BACKLINKS_INDIRECT.md`** – Examples of complex multi-hop queries for indirect relationships.
- **`docs/RELATED_CREATION.md`** – Guide to configuring the "Add Related" menu and createRelated flows.
- **`docs/IMS_CONFIG_EXAMPLE.md`** – Complete working example of a minimal IMS configuration.
- **`docs/FEATURES.md`** – Comprehensive list of all plugin features and capabilities.
- **`src/entities/full/`** – Full preset with 22 entity types as reference examples.
- **`src/entities/mini/`** – Minimal preset with person, company, and task entities.
- **`src/types/MondoEntityConfig.ts`** – TypeScript type definitions for entity configuration schema.

## Configuration concepts reference

### Entity configuration structure

Each entity in the `entities` object must include:

```typescript
{
  type: string;          // Must match the key (e.g., "person")
  name: string;          // Display name (e.g., "People")
  singular?: string;     // Singular form (e.g., "Person")
  icon: string;          // Lucide icon name (e.g., "user")
  template: string;      // Default frontmatter/body for new notes
  list?: {               // Optional table/list view configuration
    columns: [...],      // Column definitions
    sort: {...}          // Default sorting
  };
  createRelated?: [...]; // Quick-create actions in entity header
  links?: [...]          // Link panels shown below entity header
}
```

### Available list column types

- `cover` – Cover image thumbnail
- `title` – Note title with link (requires `prop`)
- `value` – Plain text property value (requires `prop`)
- `link` – Linked note(s) from property (requires `prop`)
- `date` – Formatted date from property (requires `prop`)
- `companyArea` – Combined company/area display
- `countryRegion` – Combined country/region display
- `members` – List of member links
- `locationPeople` – People at a location
- `url` – Clickable URL link

### Template tokens

Available in `template` strings and `createRelated.create.title`:

- `{{title}}` – User-provided title
- `{{type}}` – Entity type name
- `{{date}}` – Current date (YYYY-MM-DD)
- `{{datetime}}` – Current date and time
- `{{filename}}` – Sanitized filename
- `{{slug}}` – URL-safe slug from title
- `{YY}`, `{MM}`, `{DD}` – Date components
- `{hh}`, `{mm}`, `{ss}` – Time components
- `{@this}` – Link to the current entity note
- `{@this.prop}` – Value of a property from current entity
- `{@created}` – Metadata about newly created note

### Backlinks query DSL

The `find` field in backlinks panels supports graph queries with these steps:

- `{ out: { property: string | string[], type?: string | string[] } }` – Follow outbound links
- `{ in: { property: string | string[], type?: string | string[] } }` – Follow inbound links
- `{ notIn: { property: string | string[], type?: string | string[] } }` – Exclude notes linking via property
- `{ filter: { type?: string | string[] } }` – Filter by entity type
- `{ dedupe: true }` or `{ unique: true }` – Remove duplicates
- `{ not: "host" }` – Exclude the current note

Combine multiple queries with `find.combine`:
- `"union"` (default) – Merge all results
- `"intersect"` – Only notes in all queries
- `"subtract"` – Remove second query results from first

### Backlinks filter DSL

Post-query filtering with property predicates:

- Comparison: `{ eq, ne, gt, lt, gte, lte, in, nin, ... }`
- Logical: `{ all: [...], any: [...], not: {...} }`
- Special: `@this` (current note), `@this.prop` (property value)

### createRelated configuration

```typescript
{
  key: string;              // Stable identifier
  label?: string;           // Button label
  icon?: string;            // Lucide icon
  targetType?: string;      // Target entity type
  referenceLink?: string;   // Reference a link panel for defaults
  create?: {
    title?: string;         // Template for note title
    attributes?: {...};     // Frontmatter to add/override
    linkProperties?: string | string[];  // Properties to link back
    openAfterCreate?: boolean;           // Open note after creation
  }
}
```

### Cross-referencing rules

- **Header → Panel**: Use `referenceLink` in `createRelated` to inherit panel defaults
- **Panel → Header**: Use `createEntity.referenceCreate` to inherit `createRelated` settings
- Panel-level values always override referenced values

### Validation rules

When ChatGPT generates configurations, ensure:

1. Valid JSON (no comments, no trailing commas)
2. Every entity key is a non-empty string
3. `entities` object contains at least one entity
4. Each entity has a non-empty `name` string
5. `icon` defaults to `tag` if missing or invalid
6. Ordering arrays (`titles.order`, `relevantNotes.filter.order`) contain only valid entity IDs
7. `quickSearch.entities` contains only valid, unique entity IDs
8. `links` arrays are valid arrays when present
9. When referencing `createRelated` entries via `referenceCreate`, ensure the key exists
10. Template and attributes in `createRelated` are properly merged when creating notes

## Deliverable expectations

- For configuration updates: respond with a full JSON block, matching the system prompt in `docs/ENTITIES_RULES_FOR_CHATGPT.md`.
- For documentation tasks: produce Markdown aligned with the existing tone and include file path references.
- For code suggestions: provide TypeScript/TSX snippets that respect the component structure and hook conventions.

Set ChatGPT's project description to this document so the assistant is aware of the plugin's architecture, goals, and boundaries before collaborating on new ideas.
