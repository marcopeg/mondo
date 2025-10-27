# Indirect Backlinks: Proposed Configuration

This document proposes a configuration structure to express indirect relationships for Backlinks panels without changing existing defaults. It builds on the current Backlinks panel model (`targetType` + `properties`) and introduces a minimal, composable query DSL for graph-like traversals across notes and frontmatter links.

The goal is to support use cases like:

- Projects for a person
  - Direct: projects that link to the person via `participants` (or similar)
  - Indirect: projects reachable through the person’s team(s)
- Teammates for a person
  - People who share at least one team with the current person

## Mental model

- Notes form a graph where frontmatter link-like properties (e.g., `[[Some Note]]` or arrays thereof) are the edges.
- A query starts from the host note (the note whose panel is rendered), traverses the graph via steps, and collects target notes of a given `targetType`.
- Multiple queries can be combined with set operations (union, intersection, subtract) to express flexible logic.

## Backward compatibility

- If `queries` is omitted, the panel behaves exactly as today: it finds notes of `targetType` that backlink to the host using `properties` (or `prop`).
- Existing fields like `title`, `subtitle`, `icon`, `columns`, `visibility`, `pageSize`, `sort`, and `createEntity` remain unchanged.

## New config fields (proposal)

Add a new optional field `find` to BacklinksPanel config. If present, it overrides the legacy `properties`-only matching behavior.

```ts
// Type sketch (JSON-like)
interface BacklinksPanelConfigExtension {
  // Existing
  targetType: CRMEntityType | string;

  // New: advanced matching via one or more query rules
  find?: {
    /**
     * Rules to select notes starting from the host.
     * The results of all rules are combined using `combine`.
     */
    query: QueryRule[];
    /**
     * Set operation applied across the rule result sets.
     * - "union" (default): include any note returned by any rule
     * - "intersect": include only notes present in every rule's result set
     * - "subtract": start from the first rule's set, then remove any note
     *   that appears in subsequent rule sets (left-fold subtraction)
     */
    combine?: "union" | "intersect" | "subtract"; // default: "union"
  };

  // New: post-query filtering of candidate notes
  // Applied after queries are evaluated and combined, before sorting/pagination
  filter?: FilterExpr;
}

// A rule is a sequence of graph traversal steps starting at the host
interface QueryRule {
  description?: string; // optional doc/comment
  steps: QueryStep[]; // ordered steps
}

// Steps operate on a current set S of notes (start with S = {host})
// - out: follow outbound property links from S to their linked notes
// - in:  find notes that backlink to any of S through a property
// - filter: restrict S by type or other predicate
// - dedupe: optional; remove duplicates (on by default)
// - unique: alias for dedupe
// - not: subtract the host or another set (optional, see examples)

type QueryStep =
  | { out: { property: string | string[]; type?: string | string[] } }
  | { in: { property: string | string[]; type?: string | string[] } }
  | { filter: { type?: string | string[] } }
  | { dedupe?: true }
  | { unique?: true }
  | { not?: "host" };
```

Notes:

- `out.property` reads frontmatter on each note in S, resolves wiki-links/paths, and moves S to the linked notes.
- `in.property` finds notes that contain S in that property (backlinks), optionally scoped by type.
- `filter.type` limits S to notes of the provided type(s).
- `dedupe/unique` are no-ops if the implementation always maintains unique sets; included for clarity.
- `{ not: "host" }` is a convenience to remove the host from results.
- The final result is additionally filtered by the panel’s `targetType` (unless the last step already guarantees it), then rendered and sorted per existing rules.

### Combine semantics (find.combine)

- union (default): set union across all rule results; duplicates removed based on file identity (e.g., path).
- intersect: set intersection across all non-empty rule results; if a rule returns an empty set, the intersection becomes empty.
- subtract: left-fold subtraction; take the first rule's result set and remove any note that appears in the union of all subsequent rule sets. If only one rule is provided, subtract behaves identically to union for that single set.

### Top-level filter (proposal)

Introduce a `filter` field to refine the final candidate set with property-level predicates. This enables use cases like separating 1:1 meetings from group meetings.

```ts
// Filter expression DSL
type FilterExpr =
  | FilterPredicate
  | { all: FilterExpr[] } // logical AND
  | { any: FilterExpr[] } // logical OR
  | { not: FilterExpr }; // logical NOT

// A predicate targets property paths with one or more comparators
type FilterPredicate = {
  [propertyPath: string]: Comparator;
};

// Supported comparators
type Comparator = {
  exists?: boolean; // property exists and is non-empty
  eq?: unknown; // equality
  ne?: unknown; // inequality
  gt?: number; // greater-than (numbers)
  gte?: number; // >=
  lt?: number; // <
  lte?: number; // <=
  contains?: unknown; // arrays/strings contain; supports "@this"
  notContains?: unknown; // inverse of contains
  in?: unknown[]; // value in set
  nin?: unknown[]; // value not in set
};

// Special property path helpers:
// - Use ".length" to compare array length, e.g. "participants.length": { gt: 2 }
// - Use the bare property name to compare the entire value (array/string/object)
// - Use "@this" as a magic token for the host note identity
```

Execution order with `filter`:

1. Evaluate each query rule’s steps starting from the host
2. Combine query result sets per `combine` (default union)
3. Apply `filter` (if any) to the combined set
4. Enforce `targetType` (if needed), then sort/paginate/render

## Examples

### 1) Person → Projects (direct + via team)

We want:

- Direct: any `type=project` that backlinks to the person through `participants` (or `people`).
- Indirect path A (team → project via team’s outbound links):
  - Host(person) `out: team|teams` → team notes
  - From teams, `out: project|projects` → project notes
- Indirect path B (project backlinks to team):
  - Host(person) `out: team|teams` → team notes
  - From those team notes, find `type=project` notes that backlink to any of these teams via `team|teams`.

You can implement either A or B depending on your schema. Below shows both; keep the one that matches your vault.

```jsonc
{
  "type": "backlinks",
  "targetType": "project",
  "title": "Projects",
  "find": {
    "query": [
      // Direct: projects that backlink to the person
      {
        "description": "Direct backlinks via participants/people",
        "steps": [
          {
            "in": { "property": ["participants", "people"], "type": "project" }
          },
          { "unique": true }
        ]
      },

      // Indirect A: person -> team(s) -> project(s) via team's outbound links
      {
        "description": "Via teams (team links to projects)",
        "steps": [
          { "out": { "property": ["team", "teams"], "type": "team" } },
          { "out": { "property": ["project", "projects"], "type": "project" } },
          { "unique": true }
        ]
      },

      // Indirect B: person -> team(s); then projects backlink to those teams
      {
        "description": "Via teams (projects backlink to teams)",
        "steps": [
          { "out": { "property": ["team", "teams"], "type": "team" } },
          { "in": { "property": ["team", "teams"], "type": "project" } },
          { "unique": true }
        ]
      }
    ],
    // Union results of the rules by default
    "combine": "union"
  },

  // Presentation remains unchanged
  "columns": [
    { "type": "show" },
    { "type": "date", "label": "Date", "align": "right" }
  ],
  "visibility": "always"
}
```

### 2) Person → Teammates (people who share at least one team)

We want:

- Start from the person
- Go out through `team|teams` to collect team notes
- Find persons that backlink to any of those team notes via `team|teams`
- Remove the host person from the result

```jsonc
{
  "type": "backlinks",
  "targetType": "person",
  "title": "Teammates",
  "find": {
    "query": [
      {
        "description": "People who share at least one team with the host",
        "steps": [
          { "out": { "property": ["team", "teams"], "type": "team" } },
          { "in": { "property": ["team", "teams"], "type": "person" } },
          { "not": "host" },
          { "unique": true }
        ]
      }
    ],
    "combine": "union"
  },
  "visibility": "always"
}
```

### 2.1) Person → Meetings: 1:1 only

Goal: meetings that include the host person and have exactly one participant (the host). This is useful to isolate true 1:1 notes when your schema stores the meeting attendees in a `participants` array.

```jsonc
{
  "type": "backlinks",
  "targetType": "meeting",
  "title": "1:1 Meetings",
  "find": {
    "query": [
      {
        "description": "Meetings that backlink to the host via participants/people",
        "steps": [
          {
            "in": { "property": ["participants", "people"], "type": "meeting" }
          },
          { "unique": true }
        ]
      }
    ],
    "combine": "union"
  },
  "filter": {
    "all": [
      { "participants.length": { "eq": 1 } },
      { "participants": { "contains": "@this" } }
    ]
  }
}
```

### 2.2) Person → Meetings: group meetings only

Goal: meetings that include the host person and have more than one attendee. Choose your threshold:

- `participants.length > 1` if you consider any meeting with at least 2 attendees (host + someone else) as a group meeting.
- `participants.length > 2` if you want strictly 3+ attendees (host + at least two others).

```jsonc
{
  "type": "backlinks",
  "targetType": "meeting",
  "title": "Group Meetings",
  "find": {
    "query": [
      {
        "description": "Meetings that include the host",
        "steps": [
          {
            "in": { "property": ["participants", "people"], "type": "meeting" }
          },
          { "unique": true }
        ]
      }
    ]
  },
  "filter": {
    "all": [
      { "participants": { "contains": "@this" } },
      { "participants.length": { "gt": 1 } } // change to { "gt": 2 } for 3+ attendees
    ]
  }
}
```

### 3) Optional: flexible set logic

If you need to intersect or subtract results across multiple rules, set `combine` accordingly. For example, only projects that are both direct participants and also connected via a team hop:

```jsonc
{
  "type": "backlinks",
  "targetType": "project",
  "title": "Core Projects",
  "find": {
    "query": [
      {
        "steps": [{ "in": { "property": ["participants"], "type": "project" } }]
      },
      {
        "steps": [
          { "out": { "property": ["teams"], "type": "team" } },
          { "in": { "property": ["teams"], "type": "project" } }
        ]
      }
    ],
    "combine": "intersect"
  }
}
```

## Defaults and fallbacks

- If `find` is omitted, we fall back to the current behavior: show `targetType` notes that backlink to the host via `properties`/`prop`.
- If both `find` and `properties` are present, `find` takes precedence (explicit is better than implicit).
- If `filter` is omitted, no additional property-level filtering is applied (all candidates pass).
- Column layout, sorting, pagination, visibility, and create button behavior are unchanged by this proposal.

## Implementation sketch (high-level)

- Start with the host as set S.
- For each rule in `find.query`:
  - Apply each step to transform S.
  - At the end, filter to `targetType` (if not already enforced by steps).
- Combine rule result sets according to `find.combine` (default union) and dedupe.
- Apply the top-level `filter` to the combined set, interpreting `@this` as the host note.
- Render per existing table/columns/sorting.

This approach keeps the simple cases simple while enabling powerful expressions for indirect relationships when needed, without breaking existing configurations.
