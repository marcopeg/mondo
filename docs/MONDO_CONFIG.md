# Mondo Configuration

The plugin loads all Mondo metadata from `src/mondo-config.json`.  
This file is the single source of truth for:

- the dashboard tile order;
- the filter buttons used in _Relevant Notes_;
- the entity panels displayed in _IMS Entities Quick Search_;
- every Mondo entity definition (name, icon, templates, list layout, links).

Keeping the configuration centralized ensures the UI, hooks, and utilities stay in sync. Any change to Mondo entities must be done here unless explicitly noted otherwise.

## File Structure

```jsonc
{
  "titles": {
    "order": ["person", "fact", "log", "..."]
  },
  "relevantNotes": {
    "filter": {
      "order": ["person", "fact", "log", "..."]
    }
  },
  "quickSearch": {
    "entities": ["person", "company", "role", "..."]
  },
  "entities": {
    "<entityType>": {
      "type": "<entityType>",
      "name": "<display name>",
      "icon": "<lucide icon id>",
      "settings": {
        "template": "<default frontmatter & body>"
        "sort": { "column": "...", "direction": "asc|desc" }
      There are two sources involved in configuration:

      1) Built‑in defaults: `src/mondo-config.json` (minimal)
         - This file ships with the plugin and provides the default configuration.
         - It’s intentionally minimal; use it as the baseline when no custom JSON is set.

      2) Runtime overrides: Settings → “Custom Mondo configuration (JSON)”
         - Paste a JSON config in the settings to override the defaults at runtime.
         - On Apply or Use defaults, you’ll be prompted to restart so changes apply everywhere.

      For a complete schema example, see `src/mondo-config.full.json` (reference only).

      Keeping the configuration centralized ensures the UI, hooks, and utilities stay in sync. Use the settings JSON for day‑to‑day changes; update `src/mondo-config.json` only when changing the plugin’s shipped defaults.
      },
      "links": [
        {
          "type": "backlinks",
          "key": "...",
          "config": { "...see ENTITY_LINKS.md..." }
        }
      ]
    }
  }
}
```

### `titles.order`

            "template": "<default frontmatter & body>",

Controls the order of filter buttons in the _Relevant Notes_ panel. Each entry must match a `type` key declared under `entities`.

### `quickSearch.entities`

Defines which entity types render an _IMS Entities Quick Search_ card on the dashboard. The array is order sensitive, trimmed, and lower‑cased. Items that do not correspond to a declared entity (or are duplicated) are automatically dropped during validation.

### `entities`

An object keyed by the Mondo entity type. Each value must comply with the `MondoEntityConfig` TypeScript interface. Important fields:

- `type`: **required**. Must match the object key.
- `name`: Human readable label shown across the UI.
- `icon`: Lucide icon id used in tiles, filters, and headers.
- `settings.template`: Default frontmatter/body inserted when creating a note of this type.
- `list`: Table configuration used by entity list views (`columns`, `sort`).
- `links`: Link panel definitions. For guidance on link shapes see [`ENTITY_LINKS.md`](./ENTITY_LINKS.md).
  Other properties defined in `MondoEntityConfig` can be extended as needed as the schema evolves.

## Editing Guidelines

1. **Validate JSON** – the file is loaded at runtime; invalid JSON will break the build.
2. **Keep orders in sync** – every string in `titles.order` and `relevantNotes.filter.order` must reference an entity declared under `entities`.
3. **Update types when adding entities** – after introducing a new entity, add it to both order arrays unless there is a deliberate reason not to surface it.
4. **Reuse link patterns** – common backlink configurations that used to live in `default-backlinks.ts` are now copied into each entity. When adjusting reusable pieces, update every affected entity (consider small utilities if patterns diverge).
   - `name`: Human readable label shown across the UI.
   - `icon`: Lucide icon id used in tiles, filters, and headers.
   - `template`: Default frontmatter/body inserted when creating a note of this type.

- `src/entities/index.ts` reads this file to expose:
  - `MONDO_ENTITIES`: record keyed by entity type.
  - `MONDO_ENTITY_TYPES`: ordered list of types.
  - `MONDO_UI_CONFIG`: dashboard and relevant-notes ordering.
    1. Validate JSON – invalid JSON in settings won’t be applied; a modal lists issues.
    2. Keep orders in sync – strings in `titles.order` and `relevantNotes.filter.order` must reference a declared entity. If omitted, the plugin falls back to the declared entities’ order.
    3. Update when adding entities – consider adding new types to both order arrays so they surface in the Dashboard and Relevant Notes.
    4. Reuse link patterns – see `ENTITY_LINKS.md` for backlinks examples.
    5. Templates – templates are injected as-is. Ensure frontmatter is wrapped by `---` and templating tokens match the helpers (`{{title}}`, `{{date}}`, etc.).

2. Adjust `type`, `name`, `icon`, `settings.template`, `list`, and `links`.
   `src/entities/index.ts` imports `src/mondo-config.json` as the built‑in defaults and exposes: - `MONDO_ENTITIES`: record keyed by entity type. - `MONDO_ENTITY_TYPES`: ordered list of types. - `MONDO_UI_CONFIG`: dashboard and relevant-notes ordering.
   At runtime, the settings JSON replaces the in-memory config via `setMondoConfig(...)`.
