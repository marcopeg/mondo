# Role Entity - People Column Feature

## Overview

The role entity list includes a "people" column that automatically displays the first 5 people assigned to each role, shown as a comma-separated list of clickable links in alphabetical order.

## How It Works

### Configuration

The role entity is configured in `src/entities/role.ts` with:

```typescript
list: {
  columns: ["show", "people"],
  sort: { column: "show", direction: "asc" }
}
```

This configuration tells the entity list view to display two columns:
1. **show**: The role name
2. **people**: The computed list of people in that role

### Implementation

The people column is dynamically computed in `src/views/entity-panel-view/useEntityPanels.ts` (lines 306-356):

1. **Filter**: Finds all person entities where their `role` or `roles` frontmatter property references the current role
2. **Sort**: Orders people alphabetically by their display name (case-insensitive)
3. **Limit**: Takes only the first 5 people (`MAX_LINKED_PEOPLE = 5`)
4. **Format**: Creates wiki links in the format `[[path/to/person|Display Name]]`
5. **Render**: Displays as comma-separated clickable links via `EntityLinksCell`

### Person Frontmatter

For a person to appear in a role's people column, their note's frontmatter must include:

```yaml
---
type: person
show: John Doe
role: [[Product Manager]]
# or for multiple roles:
role: 
  - [[Product Manager]]
  - [[Team Lead]]
---
```

The system supports both singular `role` and plural `roles` properties for flexibility.

### Role Frontmatter

A role note should have:

```yaml
---
type: role
show: Product Manager
---
```

## Example

Given these notes:

**Role: Product Manager**
```yaml
---
type: role
show: Product Manager
---
```

**Person: Alice Smith**
```yaml
---
type: person
show: Alice Smith
role: [[Product Manager]]
---
```

**Person: Bob Johnson**
```yaml
---
type: person
show: Bob Johnson
role: [[Product Manager]]
---
```

**Person: Charlie Brown**
```yaml
---
type: person
show: Charlie Brown
role: [[Product Manager]]
---
```

When viewing the roles list, the Product Manager row will show:

| Show | People |
|------|--------|
| Product Manager | [Alice Smith](#), [Bob Johnson](#), [Charlie Brown](#) |

## Technical Details

### Alphabetical Sorting

The sorting uses JavaScript's `localeCompare` with options:
```typescript
sortKey.localeCompare(otherSortKey, undefined, { 
  sensitivity: "base", 
  numeric: true 
})
```

This provides:
- Case-insensitive sorting
- Proper handling of accented characters
- Natural numeric sorting (e.g., "Item 2" before "Item 10")

### Link Format

The system creates Obsidian wiki links with aliases:
```
[[path/to/person/note|Display Name]]
```

This allows:
- Clicking to navigate to the person note
- Displaying the person's preferred name (from `show` property)
- Proper link resolution even if notes are moved

### Performance

The people computation is optimized:
- Only runs when `entityType === MondoFileType.ROLE` (line 307)
- Pre-computes sort keys to avoid repeated toLowerCase() calls (line 342)
- Uses a single pass to filter, map, and collect names (lines 324-344)

## Customization

### Change the Limit

To show more or fewer people, modify `MAX_LINKED_PEOPLE` in `useEntityPanels.ts`:

```typescript
const MAX_LINKED_PEOPLE = 10; // Show up to 10 people
```

### Change Sort Order

To sort by a different field or direction, modify the sort in the people computation (lines 347-350).

### Remove the Column

To hide the people column, edit `src/entities/role.ts`:

```typescript
list: {
  columns: ["show"], // Remove "people"
  sort: { column: "show", direction: "asc" }
}
```

## Related Code

- **Entity Config**: `src/entities/role.ts`
- **People Computation**: `src/views/entity-panel-view/useEntityPanels.ts` (lines 306-356)
- **Link Rendering**: `src/views/entity-panel-view/components/EntityGrid/cells/EntityLinksCell.tsx`
- **Person Entity**: `src/entities/person.ts`
- **Person Table**: `src/components/PeopleTable.tsx`

## See Also

- [Entity Configuration](./MONDO_CONFIG.md)
- [Entity Links](./ENTITY_LINKS.md)
- [Person Entity Links](./PERSON_ENTITY_LINKS.md)
