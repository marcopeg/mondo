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
- **`panelKey`** or **`referenceLink`** – optional link panel key. When provided, the action reuses the
  panel's `config` block to infer defaults such as icon, title, link properties,
  and the target type. `referenceLink` is an alias of `panelKey` for readability in JSON configs.
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

## Reusing create rules from panels and vice versa

To avoid duplicating creation rules between the header and panels you can now
cross‑reference definitions in both directions:

- From header to panel: use `panelKey` or `referenceLink` in `createRelated[]`
  to inherit panel defaults for icon/title/target type.
- From panel to header: in `links[].config.createEntity` use
  `referenceCreate: "<createRelated.key>"` to pull `title`, `attributes`, and
  `openAfterCreate` from a `createRelated` entry. Any values present under
  `createEntity` override the referenced ones.

Example JSON snippet:

```jsonc
{
  "createRelated": [
    {
      "key": "report",
      "label": "Report",
      "referenceLink": "reports",
      "create": {
        "title": "Untitled Report to {@this.show}",
        "attributes": { "reportsTo": "{@this}" }
      }
    }
  ],
  "links": [
    {
      "type": "backlinks",
      "key": "reports",
      "config": {
        "title": "Reports",
        "createEntity": {
          "referenceCreate": "report",
          // optional overrides still apply
          "title": "Untitled Report to {@this.show}"
        }
      }
    }
  ]
}
```
