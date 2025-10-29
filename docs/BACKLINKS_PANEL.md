# Backlinks Panel — Configuration Guide# Backlinks Panel — Configuration Guide

The Backlinks panel renders a table of notes that link back to the current note via frontmatter links, with flexible targeting, presentation, and sorting.The Backlinks panel renders a table of notes that link back to the current note via frontmatter links, with flexible targeting, presentation, and sorting.

You enable it by adding an entry to an entity's `links` array in `src/entities/`, using the new nested configuration structure.You enable it by adding an entry to an entity's `links` array in `src/entities/`, using the new nested configuration structure.

## Quick startkey?: string; // unique panel key used for mondoState persistence (required for stable state)

### Basic backlinks (people report to this person)## Quick start

````ts### Basic backlinks (people report to this person)

{

  type: "backlinks",targetType?: string; // optional; defaults to host entity type when omitted

  key: "reports",

  desc: "People who report directly to the host",```ts

  config: {{

    targetType: "person",  type: "backlinks",

    properties: ["reportsTo"],  desc: "People who report directly to the host",

    title: "Reports",  config: {

    icon: "arrow-up-circle",    targetType: "person",

    columns: [    properties: ["reportsTo"],

      { type: "cover" },    title: "Reports",

      { type: "show" },    icon: "arrow-up-circle",

      { type: "attribute", key: "role" }    columns: [

    ],      { type: "cover" },

  }      { type: "show" },

}      { type: "attribute", key: "role" }

```    ],

  }

### Advanced: graph queries (indirect relationships)}

````

For queries involving multiple traversal steps or set operations, use the `find` field. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for detailed examples with teammates, multi-hop projects, and filtered meetings.

### Advanced: graph queries (indirect relationships)

## Configuration schema

For queries involving multiple traversal steps or set operations, use the `find` field. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for detailed examples with teammates, multi-hop projects, and filtered meetings.

The new backlinks configuration uses a nested structure with optional developer documentation:

## Configuration schema

````ts

// Entity link configurationThe new backlinks configuration uses a nested structure with optional developer documentation:

interface MondoEntityLink {

  type: "backlinks";```ts

  key?: string; // unique panel key for mondoState persistence (recommended)// Entity link configuration

  desc?: string; // optional: developer-readable descriptioninterface MondoEntityLink {

  config: BacklinksPanelConfig;  type: "backlinks";

}  desc?: string; // optional: developer-readable description

  config: BacklinksPanelConfig;

// Main backlinks configuration}

interface BacklinksPanelConfig {

  // Targeting// Main backlinks configuration

  targetType?: string; // entity type to list; defaults to host entity type when omittedinterface BacklinksPanelConfig {

  // Targeting

  // Optional properties to match (for legacy simple backlinks).  targetType: string; // entity type to list (e.g., "tool", "log", "person")

  // When `find` is provided, this is ignored and `find` takes precedence.

  properties?: string | string[]; // property names (case-sensitive)  // Optional properties to match (for legacy simple backlinks).

  prop?: string | string[]; // alias for properties  // Presentation

  subtitle?: string; // optional subtitle override

  // Presentation  columns?: Array<ColumnType>;

  title?: string; // optional title override  visibility?: "always" | "notEmpty"; // default: "always"

  subtitle?: string; // optional subtitle override  pageSize?: number; // pagination: omit for no limit, set for "Load more"

  icon?: string; // optional icon name (defaults to "link-2")  collapsed?: boolean; // default: false (expanded)

  columns?: Array<ColumnType>;

  visibility?: "always" | "notEmpty"; // default: "always"  - If no `key` is provided, it falls back to a computed key such as

  pageSize?: number; // pagination: omit for no limit, set for "Load more"    `backlinks:<type>` or `backlinks:<type>:<property>` (legacy behavior)

  collapsed?: boolean; // default: false (expanded)    | { strategy: "manual" } // drag & drop; persisted per-panel

    | {

  // Sorting  - Legacy fallback: `mondoState["backlinks:<type>"]` or `mondoState["backlinks:<type>:<property>"]` when `key` is not provided

  sort?:        direction?: "asc" | "desc";

    | { strategy: "manual" } // drag & drop; persisted per-panel      };

    | {

        strategy: "column";  // Create (+) button

        column: "show" | "date";  createEntity?: {

        direction?: "asc" | "desc";    enabled?: boolean; // if false, hides the + button (default: true)

      };    title?: string; // template e.g., "{date} on {show}"

    attributes?: Record<string, string | number | boolean>; // fm overrides

  // Create (+) button  };

  createEntity?: {

    enabled?: boolean; // if false, hides the + button (default: true)  // Advanced: graph queries and filtering

    title?: string; // template e.g., "{date} on {show}"  find?: {

    attributes?: Record<string, string | number | boolean>; // fm overrides    query: QueryRule[];

  };    combine?: "union" | "intersect" | "subtract"; // default: "union"

  };

  // Advanced: graph queries and filtering  filter?: FilterExpr;

  find?: {}

    query: QueryRule[];

    combine?: "union" | "intersect" | "subtract"; // default: "union"// Column types

  };type ColumnType =

  filter?: FilterExpr;  | {

}      type: "cover";

      mode?: "cover" | "contain";

// Column types      align?: "left" | "right" | "center";

type ColumnType =    }

  | {  | { type: "show"; label?: string; align?: "left" | "right" | "center" }

      type: "cover";  | { type: "date"; label?: string; align?: "left" | "right" | "center" }

      mode?: "cover" | "contain";  | {

      align?: "left" | "right" | "center";      type: "attribute";

    }      key: string;

  | { type: "show"; label?: string; align?: "left" | "right" | "center" }      label?: string;

  | { type: "date"; label?: string; align?: "left" | "right" | "center" }      align?: "left" | "right" | "center";

  | {    };

      type: "attribute";```

      key: string;

      label?: string;For advanced `find` and `filter` options, see [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md).

      align?: "left" | "right" | "center";

    };## How targeting works

````

**Entity mode** (targetType is set to an entity type):

For advanced `find` and `filter` options, see [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md).

- Lists notes of that entity type.

## How targeting works- Default properties matched are derived from the host entity type (does NOT include `related` unless explicitly configured):

- Includes the host type (e.g., `person`, `project`)

**Entity mode** (targetType is set to an entity type): - Adds common synonyms:

    - person → also matches `people`, `participants`

- Lists notes of that entity type. - team → also matches `teams`

- Default properties matched are derived from the host entity type (does NOT include `related` unless explicitly configured): - company → also matches `companies`

  - Includes the host type (e.g., `person`, `project`)- Override with `properties`/`prop`

  - Adds common synonyms:

    - person → also matches `people`, `participants`**Property mode** (using `properties` to target a specific property):

    - team → also matches `teams`

    - company → also matches `companies`- Treats property name (e.g., `reportsTo`) as the backlink property to match

- Override with `properties`/`prop`- Lists notes of `targetType`; if not specified, defaults to the host entity type

- Matches only that property unless you set `properties`/`prop`

**Property mode** (using `properties` to target a specific property):

**Property names are case-sensitive** and must match frontmatter keys precisely.

- Treats property name (e.g., `reportsTo`) as the backlink property to match

- Lists notes of `targetType`; if not specified, defaults to the host entity type## Columns

- Matches only that property unless you set `properties`/`prop`

**Column types:**

**When targetType is omitted:**

- **cover**: 64×64 image from `cover` frontmatter wikilink or path

- Defaults to the host entity's type (e.g., if viewing a person note, targetType defaults to "person")

  - `mode`: `"cover"` (default) or `"contain"` for object-fit

**Property names are case-sensitive** and must match frontmatter keys precisely. - `align`: `"left"`, `"right"`, or `"center"`

## Panel state persistence (key attribute)- **show**: Display name (falls back to filename)

The top-level `key` attribute identifies the panel for state persistence: - `label`: Optional column header

- `align`: Text alignment

`````ts

{- **date**: The `date` frontmatter field

  type: "backlinks",

  key: "teammates",  // recommended: unique key for stable state storage  - `label`: Optional column header (default: "Date")

  config: { ... }  - `align`: Defaults to `"right"`

}

```- **attribute**: Any raw frontmatter value by key

  - `key`: Property name (required)

**State stored under `mondoState["backlinks:{key}"]`:**  - `label`: Optional column header

  - `align`: Text alignment

- `collapsed`: boolean (panel expanded/collapsed state)

- `order`: array of file paths (for manual sorting)**Default columns** (when omitted):



**Fallback behavior (legacy):**```ts

[{ type: "show" }, { type: "date", label: "Date", align: "right" }];

- If `key` is omitted, a computed key is used: `backlinks:{targetType}` or `backlinks:{targetType}:{property}````

- This fallback maintains compatibility with older configurations but may be less stable if config changes

## Sorting and ordering

**Best practice:** Always provide a unique `key` for each backlinks panel to ensure state persistence remains stable across config refactors.

### Manual sorting

## Columns

- `sort: { strategy: "manual" }` enables drag & drop

**Column types:**- Order persists per-panel in the note's frontmatter:

  - `mondoState["backlinks:<type>"].order` for simple backlinks

- **cover**: 64×64 image from `cover` frontmatter wikilink or path  - `mondoState["backlinks:<type>:<property>"].order` for property-based backlinks



  - `mode`: `"cover"` (default) or `"contain"` for object-fit### Column sorting

  - `align`: `"left"`, `"right"`, or `"center"`

- `sort: { strategy: "column", column: "show" | "date", direction?: "asc" | "desc" }`

- **show**: Display name (falls back to filename)- Alphabetical sort for `show`, date comparison for `date`

- **Default** (when `sort` is omitted): `{ strategy: "column", column: "date", direction: "desc" }` (newest first)

  - `label`: Optional column header

  - `align`: Text alignment## Create (+) button



- **date**: The `date` frontmatter fieldWhen `createEntity.enabled` is true (default), the panel shows a + button that:



  - `label`: Optional column header (default: "Date")- Creates a new note of the `targetType`

  - `align`: Defaults to `"right"`- Uses the template and root path configured for that entity type

- Links the new note back to the host using matching properties

- **attribute**: Any raw frontmatter value by key- Applies `createEntity.attributes` overrides to the new note's frontmatter

  - `key`: Property name (required)

  - `label`: Optional column header**Template tokens available in title and attributes:**

  - `align`: Text alignment

- `{date}`: YYYY-MM-DD (local date)

**Default columns** (when omitted):- `{datetime}`: ISO timestamp

- `{show}`: display name of the host note

```ts- `{YYYY}` / `{YY}`: full year / 2-digit year

[{ type: "show" }, { type: "date", label: "Date", align: "right" }];- `{MM}`: zero-padded month (01–12)

```- `{DD}`: zero-padded day (01–31)

- `{hh}`: zero-padded hour (00–23)

## Sorting and ordering- `{mm}`: zero-padded minutes (00–59)

- `{@this}`: inserts a wiki link to the host note

### Manual sorting- `{@this.show}`: copies the host's `show` frontmatter value, or display name if missing

- `{@this.<prop>}`: copies raw frontmatter value from the host (arrays and primitives preserved)

- `sort: { strategy: "manual" }` enables drag & drop

- Order persists per-panel in the note's frontmatter under `mondoState["backlinks:{key}"].order`**Example templates:**

- If `key` is not provided, falls back to `mondoState["backlinks:{type}"].order` or `mondoState["backlinks:{type}:{property}"].order`

```ts

### Column sorting// Timestamped title with person's name

createEntity: {

- `sort: { strategy: "column", column: "show" | "date", direction?: "asc" | "desc" }`  enabled: true,

- Alphabetical sort for `show`, date comparison for `date`  title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",

- **Default** (when `sort` is omitted): `{ strategy: "column", column: "date", direction: "desc" }` (newest first)  // Result: "25-10-27 06.57 with Jane Smith"

}

## Create (+) button

// Log entry with ISO timestamp

When `createEntity.enabled` is true (default), the panel shows a + button that:createEntity: {

  enabled: true,

- Creates a new note of the `targetType`  title: "{date} on {show}",

- Uses the template and root path configured for that entity type  attributes: { date: "{datetime}" },

- Applies `createEntity.attributes` overrides to the new note's frontmatter  // Result: title "2025-10-27 on Project X", date set to ISO

- **Linking behavior:**}

  - If `createEntity.attributes` is **provided** (has at least one key), the default auto-linking to the host is **DISABLED**. Only the explicit attributes are written. This gives you full control over how links are established.

  - If `createEntity.attributes` is **omitted entirely**, the creation helper will add a default backlink using the host's entity type key (e.g., on a person host it sets `person: [[Host]]`).// Copy host properties into new note

createEntity: {

**Template tokens available in title and attributes:**  enabled: true,

  title: "New Report",

- `{date}`: YYYY-MM-DD (local date)  attributes: {

- `{datetime}`: ISO timestamp    company: "{@this.company}",

- `{show}`: display name of the host note    team: "{@this.team}",

- `{YYYY}` / `{YY}`: full year / 2-digit year    reportsTo: "{@this}",

- `{MM}`: zero-padded month (01–12)  },

- `{DD}`: zero-padded day (01–31)}

- `{hh}`: zero-padded hour (00–23)```

- `{mm}`: zero-padded minutes (00–59)

- `{@this}`: inserts a wiki link to the host note**Notes about `{@this}` behavior:**

- `{@this.show}`: copies the host's `show` frontmatter value, or display name if missing

- `{@this.<prop>}`: copies raw frontmatter value from the host (arrays and primitives preserved)- If the attribute key is also used in `properties` for linking, creation avoids overwriting the link array and skips setting a scalar over it.

- `{@this.<prop>}` copies values as-is (arrays remain arrays, primitives remain primitives)

**Example templates:**- `{@this.show}` falls back to display name / filename if the host's `show` is missing



```ts## Collapsed state and persistence

// Timestamped title with person's name

createEntity: {- The panel's collapsed state persists in the note's frontmatter:

  enabled: true,  - `mondoState["backlinks:<type>"].collapsed` or

  title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",  - `mondoState["backlinks:<type>:<property>"].collapsed`

  // Result: "25-10-27 06.57 with Jane Smith"

}## Advanced: graph queries and filtering



// Log entry with ISO timestampFor indirect relationships (e.g., teammates, multi-hop projects, filtered meetings), use the `find` and `filter` fields. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for complete examples and DSL documentation.

createEntity: {

  enabled: true,**Key points:**

  title: "{date} on {show}",

  attributes: { date: "{datetime}" },- `find.query`: Array of traversal rules to collect candidate notes

  // Result: title "2025-10-27 on Project X", date set to ISO- `find.combine`: How to combine results across rules (`union` (default), `intersect`, `subtract`)

  // Note: attributes present, so default host backlink is suppressed- `filter`: Property-level predicates to refine candidates (supports `@this` for host note reference)

}

## Backward compatibility

// Copy host properties into new note

createEntity: {- If `find` is omitted, the panel uses legacy `properties`-based matching

  enabled: true,- If both `find` and `properties` are present, `find` takes precedence

  title: "New Report",- If `filter` is omitted, no additional filtering is applied

  attributes: {- All existing fields (title, icon, columns, sort, createEntity, etc.) work as before

    company: "{@this.company}",

    team: "{@this.team}",## Defaults overview

    reportsTo: "{@this}",

  },| Field                  | Default                                                     |

  // Note: reportsTo explicitly set, no default auto-link added| ---------------------- | ----------------------------------------------------------- |

}| `columns`              | `[{ type: "show" }, { type: "date", align: "right" }]`      |

| `sort`                 | `{ strategy: "column", column: "date", direction: "desc" }` |

// Default behavior (no attributes)| `visibility`           | `"always"`                                                  |

createEntity: {| `createEntity.enabled` | `true`                                                      |

  enabled: true,| `createEntity.title`   | `"Untitled <TargetName>"`                                   |

  title: "New Meeting",| `collapsed`            | `false` (expanded)                                          |

  // Result: new meeting will auto-link back with person: [[Host]]| `pageSize`             | Omitted (no pagination)                                     |

}

```## Troubleshooting



**Notes about `{@this}` behavior:****Panel shows nothing:**



- `{@this}` in attributes produces a wiki link to the host note- Check that property names are exact (case-sensitive)

- `{@this.<prop>}` copies values as-is (arrays remain arrays, primitives remain primitives)- Ensure target notes use valid wiki links in frontmatter

- `{@this.show}` falls back to display name / filename if the host's `show` is missing- If using `visibility: "notEmpty"`, the card hides when empty

- When `createEntity.attributes` is provided, you have full control: no default links are added automatically- For `find` queries, verify step properties and types match your vault structure



## Collapsed state and persistence**Wrong set of notes listed:**



The panel's collapsed state persists in the note's frontmatter:- Override with `properties`/`prop` to narrow matching

- For `find` queries, add a `filter` to refine results

- Preferred: `mondoState["backlinks:{key}"].collapsed` (when top-level `key` is defined)

- Legacy fallback: `mondoState["backlinks:{type}"].collapsed` or `mondoState["backlinks:{type}:{property}"].collapsed` (when `key` is not provided)**Drag-and-drop order not persisting:**



## Advanced: graph queries and filtering- Confirm the note is saved to disk

- Check that frontmatter is writable

For indirect relationships (e.g., teammates, multi-hop projects, filtered meetings), use the `find` and `filter` fields. See [BACKLINKS_INDIRECT.md](./BACKLINKS_INDIRECT.md) for complete examples and DSL documentation.

## Examples in the codebase

**Key points:**

See `src/entities/person.ts` for production examples:

- `find.query`: Array of traversal rules to collect candidate notes

- `find.combine`: How to combine results across rules (`union` (default), `intersect`, `subtract`)- **Teammates**: Graph traversal (person → team → person) with host exclusion

- `filter`: Property-level predicates to refine candidates (supports `@this` for host note reference)- **1o1s**: Direct backlinks with participant count filter (eq: 1)

- **Meetings (deep linked)**: Union of direct + team-mediated with OR filter

## Backward compatibility- **Projects (deep linked)**: Union of direct + team-mediated with participant count filter (gt: 1)

- **Reports**: Simple property-based backlinks

- If `find` is omitted, the panel uses legacy `properties`-based matching

- If both `find` and `properties` are present, `find` takes precedenceSee `src/entities/company.ts` and `src/entities/default-backlinks.ts` for additional examples.

- If `filter` is omitted, no additional filtering is applied
- All existing fields (title, icon, columns, sort, createEntity, etc.) work as before
- Configs without a top-level `key` use a computed fallback key for state persistence

## Defaults overview

| Field                  | Default                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `targetType`           | Host entity type (when omitted)                             |
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
- Ensure the panel has a stable `key` attribute

**Created notes don't link back to host:**

- If using `createEntity.attributes`, remember that default auto-linking is disabled
- Add explicit link attributes like `person: "{@this}"` or `participants: ["{@this}"]`

## Examples in the codebase

See `src/entities/person.ts` for production examples:

- **Teammates**: Graph traversal (person → team → person) with host exclusion
- **1o1s**: Direct backlinks with participant count filter (eq: 1)
- **Meetings (deep linked)**: Union of direct + team-mediated with OR filter
- **Projects (deep linked)**: Union of direct + team-mediated with participant count filter (gt: 1)
- **Reports**: Simple find DSL backlinks using `in` step

See `src/entities/company.ts` and `src/entities/default-backlinks.ts` for additional examples.

## Header badge

When the panel renders the create (`+`) action, you can surface summary context
with a badge placed immediately to the left of the button:

- `badge.enabled` (`true` by default) toggles the badge on or off.
- `badge.content` (`"{count}"` by default) controls the badge text. Use
  placeholders to inject dynamic values:
  - `{count}` → number of rows currently shown in the table
  - `{date}` → most recent `date` value found in the listed entries (falls back
    to the raw string when it cannot be parsed)
`````
