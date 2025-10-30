# CRM Configuration Example

This guide shows a minimal `mondo-config.json` setup for a CRM-style workspace. The configuration declares four entity types — `person`, `fact`, `document`, and `idea` — and wires them together so that supporting notes can point back to a person by using a shared `reference` property. The person entity renders a single backlinks panel that merges all of those note types into one manually sortable list.

## 1. Sample `mondo-config.json`

> Paste the following JSON into the plugin settings (_Settings → Mondo CRM → Custom Mondo configuration (JSON)_). It can also live in `src/mondo-config.json` if you are shipping new defaults with the plugin.

```jsonc
{
  "titles": {
    "order": ["person", "fact", "document", "idea"]
  },
  "relevantNotes": {
    "filter": {
      "order": ["person", "fact", "document", "idea"]
    }
  },
  "entities": {
    "person": {
      "type": "person",
      "name": "People",
      "icon": "user",
      "template": "---\ntype: person\nshow: {{title}}\nrole: []\ncompany: []\n---\n",
      "links": [
        {
          "type": "backlinks",
          "key": "reference-notes",
          "config": {
            "title": "Reference material",
            "icon": "layers",
            "targetType": "fact",
            "find": {
              "query": [
                {
                  "description": "Reference materials referencing this person",
                  "steps": [
                    {
                      "in": {
                        "property": "reference",
                        "type": ["fact", "document", "idea"]
                      }
                    }
                  ]
                }
              ],
              "combine": "union"
            },
            "filter": {
              "type": {
                "in": ["fact", "document", "idea"]
              }
            },
            "columns": [
              { "type": "show" },
              { "type": "attribute", "key": "type", "label": "Kind" },
              { "type": "date", "label": "Date", "align": "right" }
            ],
            "sort": { "strategy": "manual" },
            "createEntity": {
              "title": "Untitled reference note",
              "attributes": {
                "reference": "{@this}"
              }
            }
          }
        }
      ]
    },
    "fact": {
      "type": "fact",
      "name": "Facts",
      "icon": "info",
      "template": "---\ntype: fact\nshow: {{title}}\ndate: {{date}}\nreference: []\n---\n"
    },
    "document": {
      "type": "document",
      "name": "Documents",
      "icon": "file-text",
      "template": "---\ntype: document\nshow: {{title}}\ndate: {{date}}\nreference: []\n---\n"
    },
    "idea": {
      "type": "idea",
      "name": "Ideas",
      "icon": "sparkles",
      "template": "---\ntype: idea\nshow: {{title}}\nstatus: draft\nreference: []\n---\n"
    }
  }
}
```

Key points:

- `reference` is the single link property that every supporting note type uses to point back to a person (`[[Ada Lovelace]]`, for example).
- The backlinks panel on the person entity uses a `find` query with `combine: "union"` so that facts, documents, and ideas all appear in one list.
- Using a single `in` step with `type: ["fact", "document", "idea"]` keeps the DSL concise while covering every note that should surface here.
- `sort.strategy` is set to `"manual"`, enabling drag-and-drop reordering directly inside Obsidian. The persisted order is stored per person note.
- A `type` column is added so you can quickly tell which kind of note each entry represents.

## 2. Frontmatter examples

Create notes from the entity templates and update the `reference` array to point to the correct person. Below are sample frontmatter blocks you can paste into Obsidian.

```markdown
---
type: person
show: Ada Lovelace
role:
  - Analytical Engine Researcher
company:
  - [[Analytical Engine Initiative]]
---
```

```markdown
---
type: fact
show: Favorite coffee order
date: 2024-03-18
reference:
  - [[Ada Lovelace]]
---
Ada prefers a flat white before morning stand-ups.
```

```markdown
---
type: document
show: Quarterly planning deck
date: 2024-03-01
reference:
  - [[Ada Lovelace]]
---
Link to the exported PDF lives here.
```

```markdown
---
type: idea
show: Async status updates
status: draft
reference:
  - [[Ada Lovelace]]
---
An experiment in collecting daily updates without meetings.
```

With the configuration above, opening `Ada Lovelace` will render a single **Reference material** panel under the note. You can drag entries up or down to arrange them manually; the plugin will remember the order per person. Adding new facts, documents, or ideas with the `reference` property automatically makes them appear in that combined list.
