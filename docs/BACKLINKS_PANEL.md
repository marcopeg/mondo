# Backlinks Panel — Configuration Guide

The Backlinks panel renders a table of notes that link back to the current note via frontmatter links, with flexible targeting, presentation, and sorting.

You enable it by adding an entry to an entity’s `links` array, e.g. in `src/entities/person.ts`.

## Quick examples

### 1) People who report to this person (property mode)

```ts
{
  type: "backlinks",
  targetType: "person",  // list only person notes
  targetKey: "reportsTo", // property to match (on other person notes)
  columns: [{ type: "show" }, { type: "date", label: "Added on:" }],
}
```

This lists person notes whose frontmatter `reportsTo` property contains a link to the current person.

### 2) Tools linked to this person (entity mode + property override)

```ts
{
  type: "backlinks",
  targetType: "tool",       // list tool notes
  properties: ["owner"],     // match when tool.owner links to this person
  columns: [
    { type: "cover", mode: "cover" },
    { type: "show" },
  ],
}
```

### 3) Recent logs for this person with quick create

```ts
{
  type: "backlinks",
  targetType: "log", // list logs
  properties: ["related", "person"], // match when any of these link to this person
  pageSize: 5, // show Load more after 5
  sort: { strategy: "column", column: "date", direction: "desc" },
  createEntity: {
    enabled: true,
    title: "{date} on {show}",
    attributes: { date: "{datetime}" }
  },
}
```

## Configuration schema

Backlinks panel config object placed in an entity’s `links` array:

```ts
{
  type: "backlinks",
  // Targeting
  targetType?: string; // entity type to list (e.g., "tool", "log", "person")
  targetKey?: string;  // property name to match on target notes (e.g., "reportsTo")

  // Optional frontmatter properties to match (overrides defaults). Alias: `prop`.
  // Accepts string or string[]; property names are case-sensitive.
  properties?: string | string[];
  prop?: string | string[];

  // Presentation
  title?: string;    // optional title override (defaults to target type name)
  subtitle?: string; // optional subtitle override (defaults to "Linked to <host>")
  icon?: string;     // optional icon name (defaults to "link-2")
  columns?: Array<
    | { type: "cover"; mode?: "cover" | "contain" }
    | { type: "show"; label?: string }
    | { type: "date"; label?: string }
  >;
  visibility?: "always" | "notEmpty"; // default: "always"
  pageSize?: number; // default: 5

  // Sorting
  sort?:
    | { strategy: "manual" } // drag & drop; persisted per-panel
    | { strategy: "column"; column: "show" | "date"; direction?: "asc" | "desc" };

  // Create (+) button
  createEntity?: {
    enabled?: boolean; // if false, hides the + button
    title?: string; // template e.g., "{date} on {show}"
    attributes?: Record<string, string | number | boolean>; // fm overrides
  };

  // Collapsed state (default expanded unless explicitly false)
  collapsed?: boolean;
}
```

## How targeting works

- Entity mode (targetType is set to an entity type):

  - We list notes of that entity type.
  - Default properties matched are derived from the host entity type:
    - Always includes `related` and the host type (e.g., `person`, `project`).
    - Adds common synonyms for people/teams/companies:
      - person → also matches `people`, `participants`
      - team → also matches `teams`
      - company → also matches `companies`
  - You can override with `properties`/`prop`.

- Property mode (targetKey is set, or `target` was a non-type string for legacy configs):
  - We treat `targetKey` as a property name (e.g., `reportsTo`).
  - We list notes of `targetType` if provided; otherwise, the same type as the host.
  - We match only that property unless you set `properties`/`prop`.

Property names are case-sensitive and must match the frontmatter key precisely.

## Columns

- cover: Renders a 64×64 image using a `cover` frontmatter wikilink or path on the target entry.
  - mode: `cover` (default) or `contain` for object-fit behavior.
- show: Renders the display name (falls back to filename).
- date: Renders the `date` frontmatter field; you can set a custom label.

## Sorting and ordering

- Manual sorting

  - Use `sort: { strategy: "manual" }` to enable drag & drop.
  - Order persists in the current note’s frontmatter at:
    - `crmState["backlinks:<type>"].order` for entity mode
    - `crmState["backlinks:<type>:<property>"].order` for property mode

- Column sorting
  - `sort: { strategy: "column", column: "show" | "date", direction?: "asc" | "desc" }`
  - Simple alphabetical for `show`, string compare for `date`.

## Create (+) button

When `createEntity.enabled` is true, the panel shows a + button that:

- Creates a new note of the listed entity type (entity mode), or the host’s type (property mode).
- Uses your configured template and root path for that type.
- Links the new note back to the host using the default set of properties described in “Entity mode” above (not currently configurable per panel).
- Applies `createEntity.attributes` overrides to the new note’s frontmatter.

Template tokens available in title and attributes:

- `{date}`: YYYY-MM-DD (local date)
- `{datetime}`: ISO timestamp
- `{show}`: display name of the host note

## Collapsing & persistence

- The panel’s collapsed state persists in the current note’s frontmatter at:
  - `crmState["backlinks:<type>"].collapsed` or
  - `crmState["backlinks:<type>:<property>"].collapsed`

## Troubleshooting

- Panel shows nothing in property mode

  - Ensure the property name is exact (case-sensitive).
  - Ensure the target notes use wiki links or valid paths in frontmatter (e.g., `reportsTo: [[John Doe]]`).
  - If you set `visibility: "notEmpty"`, the card hides when empty.

- Wrong set of notes listed in entity mode

  - Override with `properties`/`prop` to narrow matching.

- Drag-and-drop order not persisting
  - Confirm the note is saved to disk and frontmatter is writable.

## Where to configure

- Add a Backlinks entry in an entity config file, e.g., `src/entities/person.ts` within the `links` array.
- Example snippet:

```ts
links: [
  // ... other panels ...
  { type: "backlinks", targetType: "person", targetKey: "reportsTo" },
];
```

### Backward compatibility

- Legacy `target` is still supported:
  - If it’s an entity type (e.g., `"tool"`), it behaves like `targetType`.
  - If it’s a property name (e.g., `"reportsTo"`), it behaves like `targetKey` and defaults the listed type to the host entity type.

That’s it—open a note of that entity type in Obsidian to see the panel in the Entity Links area.
