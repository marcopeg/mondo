# Frontmatter Configuration Feature

## Overview

The frontmatter configuration feature allows entities to define dynamic properties that can be added via a UI picker interface. This enables users to add structured metadata to notes through an interactive modal rather than manually editing YAML frontmatter.

## Configuration

Add a `frontmatter` field to your entity configuration to enable dynamic property addition:

```json
{
  "entities": {
    "person": {
      "type": "person",
      "name": "People",
      "icon": "user",
      "template": "---\nmondoType: person\nshow: {{title}}\n---\n",
      "frontmatter": {
        "company": {
          "type": "entity",
          "title": "Link to a Company",
          "filter": {
            "type": {
              "in": ["company"]
            }
          },
          "multiple": true
        },
        "date": {
          "type": "datetime",
          "default": "now"
        }
      }
    }
  }
}
```

## Field Configuration

Each key in the `frontmatter` object represents a property that can be added to the note. The configuration supports the following options:

### Field Types

- **`entity`**: Link to another Mondo entity (supports picker interface)
- **`datetime`**: Date/time value (future enhancement)
- **`text`**: Text value (future enhancement)
- **`number`**: Numeric value (future enhancement)
- **`boolean`**: Boolean value (future enhancement)

### Common Properties

- **`type`** (required): The field type
- **`title`** (optional): Display title shown in the UI (defaults to the property key)
- **`multiple`** (optional): Whether to allow multiple values (applies to entity type)
- **`default`** (optional): Default value or preset function (e.g., "now" for datetime)

### Entity Type Configuration

For `entity` type fields, you can configure how entities are filtered:

#### Using `filter`

Simple property-based filtering:

```json
{
  "company": {
    "type": "entity",
    "title": "Link to a Company",
    "filter": {
      "type": {
        "in": ["company", "organization"]
      }
    },
    "multiple": true
  }
}
```

The `filter` configuration uses the same syntax as backlinks panel filters:

- **`{ type: { in: [...] } }`**: Match entities with mondoType in the array
- **`{ all: [...] }`**: All conditions must match
- **`{ any: [...] }`**: Any condition must match
- **`{ not: ... }`**: Negate a condition

#### Using `find`

Advanced query-based filtering using the backlinks panel find DSL:

```json
{
  "person": {
    "type": "entity",
    "title": "Link to a Person",
    "find": {
      "query": [
        {
          "description": "All people in the vault",
          "steps": [
            {
              "filter": {
                "type": ["person"]
              }
            }
          ]
        }
      ],
      "combine": "union"
    },
    "multiple": true
  }
}
```

The `find` configuration uses the same syntax as backlinks panel find queries:

- **`query`**: Array of query rules
- **`steps`**: Array of query steps (filter, in, out, notIn, etc.)
- **`combine`**: How to combine multiple queries ("union", "intersect", "subtract")

Query steps support:
- `{ filter: { type: [...] } }`: Filter by entity type
- `{ in: { property: "prop", type: [...] } }`: Find entities linking to this one
- `{ out: { property: "prop", type: [...] } }`: Find entities this one links to
- `{ notIn: { property: "prop", type: [...] } }`: Exclude entities linking to this one
- `{ dedupe: true }` or `{ unique: true }`: Remove duplicates
- `{ not: "host" }`: Exclude the current note

## User Experience

When an entity has frontmatter configuration with at least one `entity` type field:

1. A **"+ Add property"** button appears in the entity header (next to the "+ Add Related" button)
2. Clicking the button opens a popover showing available properties to add
3. Selecting a property opens a modal with:
   - A search field to filter entities by name
   - A list of matching entities based on the filter/find configuration
4. Selecting an entity adds it to the note's frontmatter as a wikilink

### Multiple Values

When `multiple: true` is set:
- The property value becomes an array
- Multiple entities can be added without replacing existing values
- Duplicate values are prevented automatically

When `multiple: false` or not specified:
- Only one value is stored
- Adding a new value replaces the existing one

## Example Configurations

### Simple Company Link

```json
{
  "frontmatter": {
    "company": {
      "type": "entity",
      "title": "Link to a Company",
      "filter": {
        "type": { "in": ["company"] }
      },
      "multiple": false
    }
  }
}
```

Result in frontmatter:
```yaml
company: "[[Acme Corp]]"
```

### Multiple People Links

```json
{
  "frontmatter": {
    "people": {
      "type": "entity",
      "title": "Link to People",
      "filter": {
        "type": { "in": ["person"] }
      },
      "multiple": true
    }
  }
}
```

Result in frontmatter:
```yaml
people:
  - "[[John Doe]]"
  - "[[Jane Smith]]"
```

### Advanced Query with Find

```json
{
  "frontmatter": {
    "related_facts": {
      "type": "entity",
      "title": "Related Facts",
      "find": {
        "query": [
          {
            "description": "Facts referencing companies this person works for",
            "steps": [
              {
                "out": {
                  "property": "company",
                  "type": ["company"]
                }
              },
              {
                "in": {
                  "property": "company",
                  "type": ["fact"]
                }
              },
              {
                "not": "host"
              }
            ]
          }
        ],
        "combine": "union"
      },
      "filter": {
        "type": { "in": ["fact"] }
      },
      "multiple": true
    }
  }
}
```

This configuration finds facts that:
1. Reference companies that this person is linked to
2. Are not the current note itself
3. Have type "fact"

## Implementation Details

### Component Architecture

- **AddProperty**: Main button component that shows the property picker popover
- **EntitySelectionModal**: Modal for selecting entities with search and filtering
- Type definitions in `src/types/MondoEntityConfig.ts`

### Integration Points

The AddProperty component is integrated into `EntityHeaderMondo` and appears when:
1. The entity has a `frontmatter` configuration
2. At least one field has type `"entity"` (picker-compatible)

### Frontmatter Updates

When an entity is selected:
1. A wikilink is generated using Obsidian's `fileToLinktext` method
2. The frontmatter is updated using `app.fileManager.processFrontMatter`
3. Array handling respects the `multiple` configuration
4. Duplicate values are automatically prevented

## Future Enhancements

Planned support for additional field types:
- **`datetime`**: Date picker with presets like "now", "today"
- **`text`**: Simple text input field
- **`number`**: Numeric input field
- **`boolean`**: Checkbox or toggle
- **Select from predefined options**: Dropdown with fixed choices

## See Also

- [MONDO_CONFIG.md](./MONDO_CONFIG.md) - Main configuration documentation
- [ENTITY_LINKS.md](./ENTITY_LINKS.md) - Backlinks panel configuration
- Example configuration: `src/mondo-config.frontmatter-example.json`
