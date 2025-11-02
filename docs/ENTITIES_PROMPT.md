# Entities & Backlinks Prompt

This document provides a ready-to-use prompt template for change requests against the Mondo IMS configuration. Inject the current configuration and request into the placeholders before sending it to ChatGPT.

## 1. system
```
You are an expert JSON editor dedicated to building a Mondo IMS definition file. Work strictly within the provided configuration schema and output valid, minified JSON.
```

## 2. Mondo IMS configuration knowledge
```
Core concepts:
- The configuration lives in mondo-config.json and is the source of truth for:
  - Dashboard tile order (`titles.order`).
  - Relevant Notes filter order (`relevantNotes.filter.order`).
  - Entity definitions (`entities`).
- Runtime overrides can be provided via the plugin settings JSON; schema is identical to the shipped config.

Top-level schema:
{
  "titles": { "order": [<entityType>...] },
  "relevantNotes": { "filter": { "order": [<entityType>...] } },
  "entities": { "<entityType>": MondoEntityConfig }
}

Entity configuration (`MondoEntityConfig` highlights):
- `type` (string, required): Must equal the entity key.
- `name` (string): Human readable label.
- `icon` (string): Lucide icon identifier.
- `settings.template` (string): Default frontmatter/body inserted when creating a note of this type. Wrap with `---` blocks and templating tokens like `{{title}}` as needed.
- `settings.sort` (optional): `{ column: string, direction: "asc" | "desc" }` for default list sorting.
- `list`: Configures list/table layout for the entity (columns, sort, etc.).
- `links`: Array of link panel descriptors rendered in EntityLinks. Order controls panel rendering order.
- Other optional fields should follow the interface in `src/types/MondoEntityConfig.ts`.

Entity link entries:
- Each entry is an object `{ type: string, key?: string, desc?: string, config?: Record<string, unknown> }`.
- `type` chooses a renderer registered in `EntityLinks`. Common value: `"backlinks"`.
- `key` is recommended for stable persisted state (collapsed/expanded, manual ordering).
- `desc` documents intent for maintainers.

Backlinks panel configuration (`type: "backlinks"`):
- Wrapper interface:
  interface MondoEntityLink {
    type: "backlinks";
    key?: string;
    desc?: string;
    config: BacklinksPanelConfig;
  }

- `BacklinksPanelConfig` fields:
  - Targeting:
    - `targetType` (string, optional): Entity type to list. Defaults to host entity type if omitted.
    - `properties` | `prop` (string | string[], optional): Legacy direct backlinks via frontmatter properties.
    - `find` (optional): Advanced graph query for indirect relationships.
      - `find.query`: Array of query rules, each `{ description?: string, steps: QueryStep[] }`.
      - `find.combine`: How to merge rule result sets (`"union"` default, `"intersect"`, `"subtract"`).
  - Query steps operate on the set of notes:
    - `{ out: { property: string | string[], type?: string | string[] } }`: Follow outbound links.
    - `{ in: { property: string | string[], type?: string | string[] } }`: Follow inbound backlinks.
    - `{ filter: { type?: string | string[] } }`: Keep notes of specific types.
    - `{ unique: true }` or `{ dedupe: true }`: Remove duplicates.
    - `{ not: "host" }`: Drop the host note from results.
  - `filter` (optional): Post-query Filter DSL using property predicates.
    - Predicates support comparison operators (`eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `in`, `nin`, etc.).
    - Supports logical combinators `{ all: [...] }`, `{ any: [...] }`, `{ not: ... }`.
    - `@this` references the host note; `@this.<prop>` reads host frontmatter values.
  - Presentation:
    - `title`, `subtitle`, `icon` override UI text/icon.
    - `columns`: Array describing table columns (`show`, `cover`, `attribute`, `date`, etc.).
    - `visibility`: `"always"` (default) or `"notEmpty"` to hide empty panels.
    - `pageSize`: Enables pagination with “Load more”.
    - `collapsed`: Default collapsed state.
    - `sort`: Column or manual ordering strategies (`{ strategy: "column", column, direction }` or `{ strategy: "manual" }`).
    - `createEntity`: Controls quick-create button.
      - `enabled` (boolean, default true).
      - `title`: Button label template (e.g., "New Meeting").
      - `attributes`: Object merged into the new note’s frontmatter; supports `"{@this}"` tokens to link the host automatically.
      - Omitting `attributes` uses defaults that link back to host; providing it replaces defaults entirely.

Behavioral notes:
- Ensure every entity listed in orders exists under `entities` to keep UI consistent.
- When adding a new entity, update both order arrays unless intentionally hidden.
- `links` order matches panel order; missing registrations in the React registry show InlineError.
- Backlinks panel defaults: `columns` -> `[ { type: "show" }, { type: "date", align: "right" } ]`, `sort` -> `{ strategy: "column", column: "date", direction: "desc" }`, `visibility` -> `"always"`, `createEntity.enabled` -> true.
- Without `key`, collapsed/manual state fallback keys are auto-generated like `backlinks:<type>` or `backlinks:<type>:<property>`.
- Legacy behavior: If `find` absent, `properties` matching drives the panel. If both provided, `find` wins.
- Keep JSON valid (no comments), ensure arrays and objects are comma-delimited, and avoid trailing commas.
- Use wiki-style links or exact note paths in frontmatter so backlink resolution succeeds.

Testing & maintenance reminders:
- After changes, rebuild or reload plugin to apply new defaults.
- Verify entity list views align with `list` columns/sort.
- Confirm newly created notes inherit the expected template and backlinks.
```

## 3. current configuration placeholder
```
<CURRENT_MONDO_CONFIG_JSON>
```

## 4. change request placeholder
```
<CHANGE_REQUEST_DESCRIPTION>
```
