# Mondo Configuration

Mondo loads its entity system from `src/mondo-config.json`. At runtime the plugin can replace those defaults with a JSON blob pasted into the settings screen or provided from an external vault file, but the schema is always the same.

## Responsibilities

The configuration controls:

- Entity catalogue: type ids, display names, icons, templates, list layout, link panels, and related-note templates.
- Dashboard ordering: tile order, relevant-notes filter buttons, and which entities appear in the Quick Search grid.
- UI presets: reusable creation flows and backlinks panels surfaced by entity notes.

Every change flows through the validator in `src/utils/MondoConfigManager.ts`, so invalid JSON is rejected before it can break the UI.

## File structure

```jsonc
{
  "titles": {
    "order": ["person", "company", "project"]
  },
  "relevantNotes": {
    "filter": {
      "order": ["person", "project"]
    }
  },
  "quickSearch": {
    "entities": ["person", "company"]
  },
  "entities": {
    "person": {
      "name": "People",
      "icon": "user",
      "template": "...",
      "list": {
        "columns": ["cover", "show", "company"],
        "sort": { "column": "show", "direction": "asc" }
      },
      "createRelated": [
        {
          "key": "report",
          "label": "Report",
          "referenceLink": "reports",
          "create": {
            "title": "Untitled Report to {@this.show}",
            "attributes": { "reportsTo": "{@this}" },
            "linkProperties": "reports"
          }
        }
      ],
      "links": [
        {
          "type": "backlinks",
          "key": "reports",
          "config": {
            "title": "Reports",
            "columns": [{ "type": "cover" }, { "type": "show" }]
          }
        }
      ]
    }
  }
}
```

### Ordering sections

- `titles.order` drives the entity tiles shown on the dashboard home view (`src/views/dashboard-view/components/EntityTilesGrid`). Missing types are appended automatically, so supply only the deliberate order.
- `relevantNotes.filter.order` determines which types render filter buttons inside the _Relevant Notes_ card. Unknown strings are dropped; the validator fills in any missing configured entity so the UI never breaks.
- `quickSearch.entities` lists the entity types that expose the Quick Search creation widget. The validator trims to valid, unique entity ids.

### Entity definition

Each object in `entities` must comply with `MondoEntityConfig` (`src/types/MondoEntityConfig.ts`). Key fields:

- `name` and `icon` feed UI labels and icons across dashboard tiles, filters, and entity headers.
- `template` is injected when the user creates a new note of that type (Quick Search, panel actions, command palette, etc.). Tokens like `{{title}}`, `{{date}}`, `{@this}` are expanded by helpers in `src/utils/MondoTemplates.ts` and `src/utils/createEntityNoteFromInput.ts`.
- `list` configures default table columns and sorting for entity list views rendered by `EntityView` (`src/views/entity-panel-view/EntityView.tsx`). Columns accept custom strings; the view renders matching metadata or falls back to `show`/frontmatter values.
- `createRelated` defines reusable creation flows surfaced by entity headers and link panels. Supported keys inside `create`:
  - `title`: string with templating tokens.
  - `attributes`: object of frontmatter values to prefill (strings, numbers, booleans, arrays, nested objects).
  - `linkProperties`: single property name or array; the helper links the new note back to the host using these keys.
  - `openAfterCreate`: optional boolean to open the created note immediately.
- `links` enumerates the panels rendered inside the injected entity sidebar (`src/events/inject-mondo-links.tsx`). Built-in `type: "backlinks"` uses the schema documented in `MondoEntityBacklinksLinkConfig`. Custom types map to React components registered in `src/containers/EntityLinks/EntityLinks.tsx`.

### Validation and defaults

`validateMondoConfig` (`src/utils/MondoConfigManager.ts`) sanitizes any pasted JSON:

1. Confirms the payload is an object, optionally wrapped in `{ "mondoConfig": { ... } }`.
2. Ensures `entities` contains at least one object and normalises `name`/`icon` strings.
3. Verifies `links` arrays are arrays when present.
4. Normalises ordering arrays so that every known entity appears exactly once.
5. Filters `quickSearch.entities` to valid ids.

When validation fails, the plugin shows an Obsidian notice and logs detailed issues to the console. Successful validation updates the in-memory configuration and notifies subscribers through `setMondoConfig` (`src/entities/index.ts`).

## Runtime sources

The plugin chooses configuration in this order:

1. **Custom JSON pasted in settings** – `Settings → Mondo → Custom Mondo configuration (JSON)`. On apply, the validator runs and the workspace receives a `mondo:config-updated` event.
2. **Preset selector** – Settings expose presets from `MONDO_CONFIG_PRESETS` (`src/entities/index.ts`), currently `full` and `mini`.
3. **Built-in default** – `src/mondo-config.json` ships with the plugin (empty by default).

Use the custom JSON option for experiments. Update `src/mondo-config.json` only when changing the default bundle distributed with the plugin.

## Editing checklist

1. Keep the JSON valid – prefer a formatter or schema-aware editor.
2. Update ordering arrays whenever you add or remove an entity.
3. Review dashboards and entity panels after a change; entity components subscribe to config updates and will immediately reflect mistakes.
4. Document reusable link shapes in [`docs/ENTITY_LINKS.md`](./ENTITY_LINKS.md) so other contributors know how to adopt them.
