# Configuring the "Add Related" menu

The entity header now looks for a `createRelated` block on each entity
configuration. When present, it drives the actions exposed by the **Add
Related** split button.

```ts
createRelated: [
  {
    key: "meeting",
    label: "Meeting",
    icon: "calendar-plus",
    panelKey: "meetings",
    create: {
      title: "{YY}-{MM}-{DD} {hh}.{mm} with {@this.show}",
      attributes: {
        type: "meeting",
        participants: ["{@this}"],
      },
    },
  },
  {
    key: "fact",
    label: "Fact",
    icon: "bookmark-plus",
    create: {
      title: "Untitled Fact",
      attributes: {
        type: "fact",
        reportsTo: "{@this}",
        relatesTo: ["{@this}", "foobar"],
        teams: ["{@this.team}"],
      },
    },
  },
];
```

Each entry describes a single quick-create action:

- **`key`** – stable identifier used for internal state tracking. Defaults to
  `panelKey` or the resolved target type when omitted.
- **`panelKey`** – optional link panel key. When provided, the action reuses the
  panel's `config` block to infer defaults such as icon, title, link properties,
  and the target type.
- **`label`** and **`icon`** – optional overrides for the action's menu item and
  glyph.
- **`create`** – optional overrides applied when calling
  `createEntityForEntity`:
  - `title` – inline template for the new note's filename/title.
  - `attributes` – map of frontmatter templates. Use this to set
    `type: "<entity>"` (required when no `panelKey` is provided) and any other
    properties. Values support the same templating syntax as Backlinks panels:
    `{@this}` inserts a wikilink to the host note, `{@this.prop}` copies a
    frontmatter property, and date tokens such as `{YY}` or `{date}` are also
    available. Arrays are merged and deduplicated when copying from the host.
  - `linkProperties` – string or array of frontmatter keys that should receive a
    backlink to the host note.
  - `openAfterCreate` – whether to open the note after creation (defaults to
    `true`).

If no `createRelated` entries are defined for an entity, the **Add Related**
button is hidden. When entries are present, the first item becomes the primary
button action and the rest populate the dropdown. Missing fields fall back to
sensible defaults: the panel configuration (when available) or the target
entity's display name for the title template. The target entity type is resolved
from, in order: `create.attributes.type`, the referenced panel's configuration,
or (for legacy configs) an explicit `targetType` field.
