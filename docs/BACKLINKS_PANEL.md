# Backlinks Panel — Configuration Guide

The Backlinks panel renders a table of notes that link back to the current note via frontmatter links, with flexible targeting, presentation, and sorting.

You enable it by adding an entry to an entity's `links` array in `src/entities/`, using the new nested configuration structure.

## Quick start

### Basic backlinks (people report to this person)

```ts
{
  type: "backlinks",
  desc: "People who report directly to the host",
  config: {
    targetType: "person",
    properties: ["reportsTo"],
    title: "Reports",
    icon: "arrow-up-circle",
    columns: [
      { type: "cover" },
      { type: "show" },
      { type: "attribute", key: "role" }
    ],
  }
}
```

### Advanced: graph queries (indirect relationships)

For queries involving multiple traversal steps or set operations, use the `find` field. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for detailed examples with teammates, multi-hop projects, and filtered meetings.

## Configuration schema

The new backlinks configuration uses a nested structure with optional developer documentation:

```ts
// Entity link configuration
interface CRMEntityLink {
  type: "backlinks";
  desc?: string; // optional: developer-readable description
  config: BacklinksPanelConfig;
}

// Main backlinks configuration
interface BacklinksPanelConfig {
  // Targeting
  targetType: string; // entity type to list (e.g., "tool", "log", "person")

  // Optional properties to match (for legacy simple backlinks).
  // When `find` is provided, this is ignored and `find` takes precedence.
  properties?: string | string[]; // property names (case-sensitive)
  prop?: string | string[]; // alias for properties

  // Presentation
  title?: string; // optional title override
  subtitle?: string; // optional subtitle override
  icon?: string; // optional icon name (defaults to "link-2")
  columns?: Array<ColumnType>;
  visibility?: "always" | "notEmpty"; // default: "always"
  pageSize?: number; // pagination: omit for no limit, set for "Load more"
  collapsed?: boolean; // default: false (expanded)

  // Sorting
  sort?:
    | { strategy: "manual" } // drag & drop; persisted per-panel
    | {
        strategy: "column";
        column: "show" | "date";
        direction?: "asc" | "desc";
      };

  // Create (+) button
  createEntity?: {
    enabled?: boolean; // if false, hides the + button (default: true)
    title?: string; // template e.g., "{date} on {show}"
    attributes?: Record<string, string | number | boolean>; // fm overrides
  };

  // Advanced: graph queries and filtering
  find?: {
    query: QueryRule[];
    combine?: "union" | "intersect" | "subtract"; // default: "union"
  };
  filter?: FilterExpr;
}

// Column types
type ColumnType =
  | {
      type: "cover";
      mode?: "cover" | "contain";
      align?: "left" | "right" | "center";
    }
  | { type: "show"; label?: string; align?: "left" | "right" | "center" }
  | { type: "date"; label?: string; align?: "left" | "right" | "center" }
  | {
      type: "attribute";
      key: string;
      label?: string;
      align?: "left" | "right" | "center";
    };
```

For advanced `find` and `filter` options, see [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md).

## How targeting works

**Entity mode** (targetType is set to an entity type):

- Lists notes of that entity type.
- Default properties matched are derived from the host entity type (does NOT include `related` unless explicitly configured):
  - Includes the host type (e.g., `person`, `project`)
  - Adds common synonyms:
    - person → also matches `people`, `participants`
    - team → also matches `teams`
    - company → also matches `companies`
- Override with `properties`/`prop`

**Property mode** (using `properties` to target a specific property):

- Treats property name (e.g., `reportsTo`) as the backlink property to match
- Lists notes of `targetType`; if not specified, defaults to the host entity type
- Matches only that property unless you set `properties`/`prop`

**Property names are case-sensitive** and must match frontmatter keys precisely.

## Columns

**Column types:**

- **cover**: 64×64 image from `cover` frontmatter wikilink or path

  - `mode`: `"cover"` (default) or `"contain"` for object-fit
  - `align`: `"left"`, `"right"`, or `"center"`

- **show**: Display name (falls back to filename)

  - `label`: Optional column header
  - `align`: Text alignment

- **date**: The `date` frontmatter field

  - `label`: Optional column header (default: "Date")
  - `align`: Defaults to `"right"`

- **attribute**: Any raw frontmatter value by key
  - `key`: Property name (required)
  - `label`: Optional column header
  - `align`: Text alignment

**Default columns** (when omitted):

```ts
[{ type: "show" }, { type: "date", label: "Date", align: "right" }];
```

## Sorting and ordering

### Manual sorting

- `sort: { strategy: "manual" }` enables drag & drop
- Order persists per-panel in the note's frontmatter:
  - `crmState["backlinks:<type>"].order` for simple backlinks
  - `crmState["backlinks:<type>:<property>"].order` for property-based backlinks

### Column sorting

- `sort: { strategy: "column", column: "show" | "date", direction?: "asc" | "desc" }`
- Alphabetical sort for `show`, date comparison for `date`
- **Default** (when `sort` is omitted): `{ strategy: "column", column: "date", direction: "desc" }` (newest first)

## Create (+) button

When `createEntity.enabled` is true (default), the panel shows a + button that:

- Creates a new note of the `targetType`
- Uses the template and root path configured for that entity type
- Links the new note back to the host using matching properties
- Applies `createEntity.attributes` overrides to the new note's frontmatter

**Template tokens available in title and attributes:**

- `{date}`: YYYY-MM-DD (local date)
- `{datetime}`: ISO timestamp
- `{show}`: display name of the host note
- `{YYYY}` / `{YY}`: full year / 2-digit year
- `{MM}`: zero-padded month (01–12)
- `{DD}`: zero-padded day (01–31)
- `{hh}`: zero-padded hour (00–23)
- `{mm}`: zero-padded minutes (00–59)
- `{@this}`: inserts a wiki link to the host note
- `{@this.show}`: copies the host's `show` frontmatter value, or display name if missing
- `{@this.<prop>}`: copies raw frontmatter value from the host (arrays and primitives preserved)

**Example templates:**

```ts
// Timestamped title with person's name
createEntity: {
  enabled: true,
  title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
  // Result: "25-10-27 06.57 with Jane Smith"
}

// Log entry with ISO timestamp
createEntity: {
  enabled: true,
  title: "{date} on {show}",
  attributes: { date: "{datetime}" },
  // Result: title "2025-10-27 on Project X", date set to ISO
}

// Copy host properties into new note
createEntity: {
  enabled: true,
  title: "New Report",
  attributes: {
    company: "{@this.company}",
    team: "{@this.team}",
    reportsTo: "{@this}",
  },
}
```

**Notes about `{@this}` behavior:**

- If the attribute key is also used in `properties` for linking, creation avoids overwriting the link array and skips setting a scalar over it.
- `{@this.<prop>}` copies values as-is (arrays remain arrays, primitives remain primitives)
- `{@this.show}` falls back to display name / filename if the host's `show` is missing

## Collapsed state and persistence

- The panel's collapsed state persists in the note's frontmatter:
  - `crmState["backlinks:<type>"].collapsed` or
  - `crmState["backlinks:<type>:<property>"].collapsed`

## Advanced: graph queries and filtering

For indirect relationships (e.g., teammates, multi-hop projects, filtered meetings), use the `find` and `filter` fields. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for complete examples and DSL documentation.

**Key points:**

- `find.query`: Array of traversal rules to collect candidate notes
- `find.combine`: How to combine results across rules (`union` (default), `intersect`, `subtract`)
- `filter`: Property-level predicates to refine candidates (supports `@this` for host note reference)

## Backward compatibility

- If `find` is omitted, the panel uses legacy `properties`-based matching
- If both `find` and `properties` are present, `find` takes precedence
- If `filter` is omitted, no additional filtering is applied
- All existing fields (title, icon, columns, sort, createEntity, etc.) work as before

## Defaults overview

| Field                  | Default                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `columns`              | `[{ type: "show" }, { type: "date", align: "right" }]`      |
| `sort`                 | `{ strategy: "column", column: "date", direction: "desc" }` |
| `visibility`           | `"always"`                                                  |
| `createEntity.enabled` | `true`                                                      |
| `createEntity.title`   | `"Untitled <TargetName>"`                                   |
| `collapsed`            | `false` (expanded)                                          |
| `pageSize`             | Omitted (no pagination)                                     |

## Troubleshooting

**Panel shows nothing:**

- Check that property names are exact (case-sensitive)
- Ensure target notes use valid wiki links in frontmatter
- If using `visibility: "notEmpty"`, the card hides when empty
- For `find` queries, verify step properties and types match your vault structure

**Wrong set of notes listed:**

- Override with `properties`/`prop` to narrow matching
- For `find` queries, add a `filter` to refine results

**Drag-and-drop order not persisting:**

- Confirm the note is saved to disk
- Check that frontmatter is writable

## Examples in the codebase

See `src/entities/person.ts` for production examples:

- **Teammates**: Graph traversal (person → team → person) with host exclusion
- **1o1s**: Direct backlinks with participant count filter (eq: 1)
- **Meetings (deep linked)**: Union of direct + team-mediated with OR filter
- **Projects (deep linked)**: Union of direct + team-mediated with participant count filter (gt: 1)
- **Reports**: Simple property-based backlinks

See `src/entities/company.ts` and `src/entities/default-backlinks.ts` for additional examples.
