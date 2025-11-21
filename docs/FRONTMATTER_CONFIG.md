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

Values are **always stored as arrays** in the frontmatter, regardless of the `multiple` setting.

When `multiple: true` is set:
- Multiple entities can be added to the array
- The "Add property" button remains available even after adding values
- Duplicate values are prevented automatically

When `multiple: false` or not specified:
- Only one value can be added to the array
- The "Add property" button is hidden once a value exists
- Adding a value when one already exists is prevented by the UI

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

Result in frontmatter (always an array):
```yaml
company:
  - "[[Acme Corp]]"
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

## Link Anything On (Auto-generated Entity Links)

The `linkAnythingOn` configuration provides a convenient way to automatically generate frontmatter field configurations for linking to any entity type without explicitly defining each one.

### Configuration Options

#### Disabled (default)

```json
{
  "linkAnythingOn": false
}
```

The "Add link" button is not visible. Only explicitly defined frontmatter fields are available.

#### Enabled with Defaults

```json
{
  "linkAnythingOn": true
}
```

- Button is visible
- Shows all entity types in alphabetical order (by singular name)
- Links are added to the `linksTo` property by default
- All values are stored as arrays

#### Custom Property Key

```json
{
  "linkAnythingOn": "customProperty"
}
```

- Button is visible
- Shows all entity types in alphabetical order
- Links are added to the specified property (`customProperty`)

#### Advanced Configuration

```json
{
  "linkAnythingOn": {
    "key": "relatedEntities",
    "types": ["person", "company", "project"]
  }
}
```

Configuration options:
- **`key`** (optional, string): Property name to populate. Defaults to `"linksTo"` if omitted.
- **`types`** (optional, string[]): Array of entity types to show in the specified order. If omitted, all entity types are shown in alphabetical order.

**Important**: 
- Entity types in the `types` array must exist in your Mondo configuration
- Non-existent types will trigger a console warning and be ignored in the UI
- The icon and name for each type are retrieved from the entity configuration
- Only entity types not already explicitly defined in `frontmatter` are auto-generated

### Example: Company Entity

```json
{
  "entities": {
    "company": {
      "type": "company",
      "name": "Companies",
      "icon": "building-2",
      "linkAnythingOn": {
        "types": ["person", "project", "meeting", "task"]
      }
    }
  }
}
```

This generates "Add link" options for Person, Project, Meeting, and Task in that order, all linking to the `linksTo` property (default).

### Combining with Explicit Frontmatter Config

You can combine `linkAnythingOn` with explicit `frontmatter` definitions:

```json
{
  "frontmatter": {
    "location": {
      "type": "entity",
      "title": "Location",
      "filter": { "type": { "in": ["location"] } },
      "multiple": false
    }
  },
  "linkAnythingOn": true
}
```

In this case:
- The "location" field uses the explicit configuration (single value)
- All other entity types are auto-generated with `multiple: true`
- Auto-generated types link to `linksTo` property

## Implementation Details

### Component Architecture

- **AddProperty**: Main button component that shows the property picker popover
- **EntitySelectionModal**: Modal for selecting entities with search and filtering
- Type definitions in `src/types/MondoEntityConfig.ts`

### Integration Points

The AddProperty component is integrated into `EntityHeaderMondo` and appears when:
1. The entity has a `frontmatter` configuration, OR
2. The entity has `linkAnythingOn` enabled
3. At least one field has type `"entity"` (picker-compatible)

### Frontmatter Updates

When an entity is selected:
1. A wikilink is generated using Obsidian's `fileToLinktext` method
2. The frontmatter is updated using `app.fileManager.processFrontMatter`
3. All values are stored as arrays (regardless of `multiple` setting)
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
