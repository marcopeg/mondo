# CRM Configuration

The plugin loads all CRM metadata from `src/crm-config.json`.  
This file is the single source of truth for:

- the dashboard tile order;
- the filter buttons used in *Relevant Notes*;
- every CRM entity definition (name, icon, templates, list layout, links, aliases).

Keeping the configuration centralized ensures the UI, hooks, and utilities stay in sync. Any change to CRM entities must be done here unless explicitly noted otherwise.

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
  "entities": {
    "<entityType>": {
      "type": "<entityType>",
      "name": "<display name>",
      "icon": "<lucide icon id>",
      "aliases": ["optional", "..."],
      "dashboard": { },
      "settings": {
        "template": "<default frontmatter & body>"
      },
      "list": {
        "columns": ["..."],
        "sort": { "column": "...", "direction": "asc|desc" }
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
Determines the sequence of entity tiles on the dashboard (`DashboardView`). The plugin iterates through the array and renders the matching entity configurations.

### `relevantNotes.filter.order`
Controls the order of filter buttons in the *Relevant Notes* panel. Each entry must match a `type` key declared under `entities`.

### `entities`
An object keyed by the CRM entity type. Each value must comply with the `CRMEntityConfig` TypeScript interface. Important fields:

- `type`: **required**. Must match the object key.
- `name`: Human readable label shown across the UI.
- `icon`: Lucide icon id used in tiles, filters, and headers.
- `aliases`: Optional array of alternative strings recognized by the type resolver.
- `settings.template`: Default frontmatter/body inserted when creating a note of this type.
- `list`: Table configuration used by entity list views (`columns`, `sort`).
- `links`: Link panel definitions. For guidance on link shapes see [`ENTITY_LINKS.md`](./ENTITY_LINKS.md).

Other properties defined in `CRMEntityConfig` (e.g. `dashboard`) can be extended as needed.

## Editing Guidelines

1. **Validate JSON** – the file is loaded at runtime; invalid JSON will break the build.
2. **Keep orders in sync** – every string in `titles.order` and `relevantNotes.filter.order` must reference an entity declared under `entities`.
3. **Update types when adding entities** – after introducing a new entity, add it to both order arrays unless there is a deliberate reason not to surface it.
4. **Reuse link patterns** – common backlink configurations that used to live in `default-backlinks.ts` are now copied into each entity. When adjusting reusable pieces, update every affected entity (consider small utilities if patterns diverge).
5. **Aliases** – keep aliases lowercase to simplify matching; the resolver compares normalized strings.
6. **Templates** – templates are injected as-is. Ensure triple dashes `---` wrap frontmatter and double braces `{{ }}` use the templating expected by the rest of the plugin.

## Consuming the Configuration

- `src/entities/index.ts` reads this file to expose:
  - `CRM_ENTITIES`: record keyed by entity type.
  - `CRM_ENTITY_TYPES`: ordered list of types.
  - `CRM_UI_CONFIG`: dashboard and relevant-notes ordering.
- Hooks and components (e.g. `useFiles`, dashboard tiles, template helpers) rely on the exports above. No other files should import per-entity configs directly.

## Adding or Updating an Entity

1. Duplicate an existing entity block in `entities`.
2. Adjust `type`, `name`, `icon`, `settings.template`, `list`, and `links`.
3. Insert the new type in both `titles.order` and `relevantNotes.filter.order` if applicable.
4. Run `yarn build` to ensure TypeScript and the bundler accept the change.
5. Update any documentation that references the entity (including `AGENTS.md`, onboarding docs, etc.).

Following these steps keeps the CRM experience coherent across the plugin.
