# Indirect Backlinks: Configuration Guide

This document describes how to use the graph-based query DSL for indirect relationships in Backlinks panels. It supports advanced use cases like projects reachable through team hops, teammates who share teams, and filtered meetings (1:1 vs. group).

The goal is to support use cases like:

- Projects for a person
  - Direct: projects that link to the person via `participants` (or similar)
  - Indirect: projects reachable through the person's team(s)
- Teammates for a person
  - People who share at least one team with the current person

## Mental model

- Notes form a graph where frontmatter link-like properties (e.g., `[[Some Note]]` or arrays thereof) are the edges.
- A query starts from the host note (the note whose panel is rendered), traverses the graph via steps, and collects target notes of a given `targetType`.
- Multiple queries can be combined with set operations (union, intersection, subtract) to express flexible logic.

## New config structure

Backlinks configurations now use a nested structure with optional developer documentation:

```ts
// Entity link configuration with nested backlinks
interface CRMEntityLink {
  type: "backlinks";
  key?: string; // unique panel key for crmState persistence (recommended)
  desc?: string; // optional: developer-readable description
  config: BacklinksPanelConfig;
}

// Inside config, you can use the advanced `find` and `filter` fields
interface BacklinksPanelConfig {
  // Targeting
  targetType?: CRMEntityType | string; // optional; defaults to host entity type when omitted
  properties?: string | string[]; // legacy: property names to match
  prop?: string | string[]; // legacy alias for properties

  // Advanced querying (new)
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
    combine?: "union" | "intersect" | "subtract";
  };

  /**
   * Post-query filtering with property predicates.
   * Applied after queries are evaluated and combined, before sorting/pagination.
   */
  filter?: FilterExpr;

  // Presentation (all preserved from legacy backlinks)
  title?: string;
  subtitle?: string;
  icon?: string;
  columns?: ColumnSpec[];
  visibility?: "always" | "notEmpty";
  pageSize?: number;
  sort?: SortSpec;
  createEntity?: CreateEntitySpec;
  collapsed?: boolean;
}
```

## Query step types

Steps operate on a current set S of notes (starting with S = {host}):

```ts
type QueryStep =
  | { out: { property: string | string[]; type?: string | string[] } }
  | { in: { property: string | string[]; type?: string | string[] } }
  | { filter: { type?: string | string[] } }
  | { dedupe?: true }
  | { unique?: true }
  | { not?: "host" };
```

**Step semantics:**

- `out`: Follow outbound property links from each note in S, resolve wiki-links/paths, move S to the linked notes. Optionally filter by type.
- `in`: Find notes that backlink to any in S through a property. Optionally scope by type.
- `filter.type`: Limit S to notes of the provided type(s).
- `dedupe` / `unique`: Ensure S contains no duplicate notes (usually implicit).
- `{ not: "host" }`: Remove the host note from S.

## Combine semantics (find.combine)

- **union** (default): Set union across all rule results; duplicates removed by file identity.
- **intersect**: Set intersection across all non-empty rule results; if a rule returns an empty set, the intersection becomes empty.
- **subtract**: Left-fold subtraction; take the first rule's result set and remove any note that appears in the union of all subsequent rule sets. With one rule, behaves like union.

## Filter expression DSL

Introduce a `filter` field to refine the final candidate set with property-level predicates:

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
```

**Special syntax:**

- Use `".length"` to compare array length: `"participants.length": { gt: 2 }`
- Use `@this` as a magic token for the host note identity: `"participants": { contains: "@this" }`
- Bare property names compare the entire value (array/string/object)

## Examples

All examples use the new nested configuration structure with `type: "backlinks"` and a `config` object.

### Example 1: Person → Projects (direct + via team)

We want:

- Direct: any `type=project` that backlinks to the person through `participants`
- Indirect: projects reachable through the person's team(s) (teams backlink to projects)

```ts
{
  type: "backlinks",
  key: "projects-deep",
  desc: "Projects linked directly via participants or indirectly via shared teams",
  config: {
    targetType: "project",
    title: "Projects (deep linked)",
    icon: "folder-git-2",
    columns: [
      { type: "show" },
      { type: "attribute", key: "participants" },
      { type: "date", align: "right" },
    ],
    find: {
      query: [
        {
          description: "Direct backlinks via participants/people",
          steps: [
            {
              in: { property: ["participants", "people"], type: "project" }
            },
            { unique: true }
          ]
        },
        {
          description: "Via teams (projects backlink to teams)",
          steps: [
            { out: { property: ["team", "teams"], type: "team" } },
            { in: { property: ["team", "teams"], type: "project" } },
            { unique: true }
          ]
        }
      ],
      combine: "union",
    },
    filter: {
      "participants.length": { gt: 1 }
    },
    sort: {
      strategy: "column",
      column: "date",
      direction: "desc",
    },
  }
}
```

### Example 2: Person → Teammates

We want: People who share at least one team with the host person.

```ts
{
  type: "backlinks",
  key: "teammates",
  desc: "People who share at least one team with the host person",
  config: {
    targetType: "person",
    title: "Teammates",
    icon: "people",
    columns: [
      { type: "cover" },
      { type: "show" },
      { type: "attribute", key: "team" },
    ],
    find: {
      query: [
        {
          description: "People who share at least one team with the host",
          steps: [
            { out: { property: ["team", "teams"], type: "team" } },
            { in: { property: ["team", "teams"], type: "person" } },
            { not: "host" },
            { unique: true }
          ]
        }
      ],
      combine: "union",
    },
    sort: {
      strategy: "column",
      column: "show",
      direction: "asc",
    },
  }
}
```

### Example 3: Person → Meetings (1:1 only)

We want: Meetings with exactly one participant (the host).

```ts
{
  type: "backlinks",
  key: "1on1-meetings",
  desc: "Meetings with one participant (1:1 meetings)",
  config: {
    targetType: "meeting",
    title: "1o1s",
    icon: "users",
    columns: [
      { type: "show" },
      { type: "date", align: "right" }
    ],
    find: {
      query: [
        {
          description: "Meetings that backlink to the host via participants/people",
          steps: [
            { in: { property: ["participants", "people"], type: "meeting" } },
            { unique: true }
          ]
        }
      ],
      combine: "union",
    },
    filter: {
      "participants.length": { eq: 1 }
    },
    sort: {
      strategy: "column",
      column: "date",
      direction: "desc",
    },
  }
}
```

### Example 4: Person → Meetings (group meetings)

We want: Meetings that include the host person and have more than one attendee.

```ts
{
  type: "backlinks",
  key: "meetings-deep",
  desc: "Meetings with multiple participants, directly or via shared teams",
  config: {
    targetType: "meeting",
    title: "Meetings (deep linked)",
    icon: "calendar",
    columns: [
      { type: "show" },
      { type: "attribute", key: "participants" },
      { type: "date", align: "right" },
    ],
    find: {
      query: [
        {
          description: "Direct backlinks via participants/people",
          steps: [
            { in: { property: ["participants", "people"], type: "meeting" } },
            { unique: true }
          ]
        },
        {
          description: "Via teams (meetings backlink to teams)",
          steps: [
            { out: { property: ["team", "teams"], type: "team" } },
            { in: { property: ["team", "teams"], type: "meeting" } },
            { unique: true }
          ]
        }
      ],
      combine: "union",
    },
    filter: {
      any: [
        { "participants.length": { eq: 0 } },
        { "participants.length": { gt: 1 } }
      ]
    },
    sort: {
      strategy: "column",
      column: "date",
      direction: "desc",
    },
  }
}
```

### Example 5: Set intersection (advanced)

We want: Projects that are both direct participants AND connected via a team hop.

```ts
{
  type: "backlinks",
  key: "core-projects",
  desc: "Core projects (direct + team-mediated)",
  config: {
    targetType: "project",
    title: "Core Projects",
    find: {
      query: [
        {
          description: "Direct backlinks via participants",
          steps: [
            { in: { property: ["participants"], type: "project" } }
          ]
        },
        {
          description: "Indirect via team hops",
          steps: [
            { out: { property: ["teams"], type: "team" } },
            { in: { property: ["teams"], type: "project" } }
          ]
        }
      ],
      combine: "intersect"
    }
  }
}
```

## Backward compatibility

- If `find` is omitted, the panel behaves with legacy `properties`-based matching.
- If both `find` and `properties` are present, `find` takes precedence.
- If `filter` is omitted, no additional property-level filtering is applied.
- Column layout, sorting, pagination, visibility, and create button behavior are unchanged.

## Implementation notes

Execution order:

1. Evaluate each query rule's steps starting from the host.
2. Combine query result sets per `combine` (default union) and dedupe by file identity.
3. Apply `filter` (if any) to the combined set, interpreting `@this` as the host note.
4. Enforce `targetType` (if not already guaranteed by steps), then sort/paginate/render.

## Configuration examples in codebase

See `src/entities/person.ts` for production examples:

- **Teammates**: Graph traversal with host exclusion and alphabetic sort
- **1o1s**: Direct backlinks filtered to single participant
- **Meetings (deep linked)**: Union of direct and team-mediated with OR filter
- **Projects (deep linked)**: Union of direct and team-mediated with participant count filter
