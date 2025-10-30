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
    referenceLink: "meetings",
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
        participants: ["{@this}"],
      },
    },
  },
];
```

Each entry describes a single quick-create action:

- **`key`** – stable identifier used for internal state tracking and cross-referencing from panels. Required.
- **`referenceLink`** – optional link panel key. When provided, the action reuses the
  panel's config to infer defaults such as icon, title, link properties, and the target type.
  Use this instead of embedding full `create` blocks when you want to align header actions with panel creation UI.
- **`label`** and **`icon`** – optional overrides for the action's menu item and
  glyph. If omitted, defaults to the panel's title or target entity's display name.
- **`create`** – optional creation settings applied when calling
  `createEntityForEntity`:
  - `title` – inline template for the new note's filename/title.
  - `attributes` – map of frontmatter templates. Use this to set
    `type: "<entity>"` (required when no `referenceLink` is provided) and any other
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
button action (label: "+ [First Item Label]") and the rest populate the dropdown.
Missing fields fall back to sensible defaults: the panel configuration (when available via `referenceLink`)
or the target entity's display name for the title template. The target entity type is resolved
from, in order: `create.attributes.type`, the referenced panel's configuration
(if `referenceLink` is set), or an explicit `targetType` field.

## Reusing create rules from panels and vice versa

To avoid duplicating creation rules between the header and panels, you can now
cross‑reference definitions in both directions:

- **Header → Panel**: use `referenceLink` in a `createRelated[]` entry to inherit the linked panel's defaults (icon, title, target type, etc.).
- **Panel → Header**: in `links[].config.createEntity` use
  `referenceCreate: "<createRelated.key>"` to pull `title`, `attributes`, and
  `openAfterCreate` from a `createRelated` entry. Any values present under
  `createEntity` (e.g., panel-specific overrides) take precedence over the referenced rule.

### Example: Reuse the "Fact" create rule in the Facts panel

Fact entry in `createRelated`:

```ts
{
  key: "fact",
  label: "Fact",
  icon: "bookmark-plus",
  create: {
    title: "Untitled Fact",
    attributes: {
      type: "fact",
      participants: ["{@this}"],
    },
  },
}
```

Facts panel with reused rule:

```ts
{
  type: "backlinks",
  key: "facts",
  config: {
    targetType: "fact",
    title: "Facts",
    createEntity: {
      referenceCreate: "fact",  // Inherits title and attributes from createRelated
    },
  },
}
```

When a user clicks the "+" button in the Facts panel, it uses the title and attributes from the `"fact"` create rule, avoiding duplication.
