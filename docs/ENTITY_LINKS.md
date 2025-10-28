# Dynamic Links Panels — How to Add Custom Components

This guide explains how to add custom panels to CRM entity notes using the EntityLinks system. These panels show up inline when viewing a note with a CRM entity `type` in frontmatter, e.g. `type: person`.

- Injected area is created by the plugin when opening a Markdown file: see `src/events/inject-crm-links.tsx`.
- For CRM entity types, it renders `EntityLinks`: `src/containers/EntityLinks/EntityLinks.tsx`.
- The set of panels shown for a given entity type is controlled by that entity’s config in `src/crm-config.json` (`entities.<type>.links`).

If you want to add a new panel, you’ll create a component, register it in a central registry, and reference it from the target entity’s `links` list inside the JSON configuration.

> **Note:** Legacy per-entity link definitions were removed. All panels — including the reusable Backlinks panel — now live in `crm-config.json`.

## Architecture Overview

- Rendering entrypoint: `inject-crm-links.tsx`
  - Determines the current file and its frontmatter `type`.
  - For CRM types, renders `<EntityLinks />` within React providers (`AppProvider` + `EntityFileProvider`).
- Dynamic renderer: `src/containers/EntityLinks/EntityLinks.tsx`
  - Reads the focused file via `useEntityFile()`.
  - Loads the entity config from `CRM_ENTITIES`.
  - Iterates `entityConfig.links` and, for each item `{ type: string, ...config }`, picks a component from `entityMap[type]`.
  - If a type is not registered in `entityMap`, it shows an InlineError.
- Entity config: `src/crm-config.json`
  - Each entity defines a `links` array with panel descriptors.
  - Add your own `{ "type": "my-custom", ... }` link entry.

### Folder layout

```
src/containers/EntityLinks/
  EntityLinks.tsx        # orchestrator (registry + renderer)
  index.ts               # public export
  panels/                # one file per panel implementation
    MeetingsLinks.tsx
    ProjectsLinks.tsx
    ...
```

Keep shared utilities that are only used by panels next to the panels (e.g. create a `panels/utils/` folder) so the feature stays self-contained.

Tip: Need a highly flexible, property- or type-driven list? See the Backlinks panel guide in `docs/BACKLINKS_PANEL.md`.

## Conventions and Building Blocks

- TypeScript style: prefer arrow functions, `const` over `let`, never `var` or `any`. See `AGENTS.md`.
- Use shared UI components for consistency:
  - `Card` for panel framing: `src/components/ui/Card`
  - `Button`, `Stack`, and domain tables like `MeetingsTable`, `ProjectsTable`, etc.
- Hooks and utils you’ll likely use:
  - `useEntityFile()` — get the focused note (file + cache): `src/context/EntityFileProvider.tsx`
  - `useFiles(entityType, { filter })` — fetch lists of vault files: `src/hooks/use-files.ts`
  - `matchesPropertyLink` / `matchesAnyPropertyLink` — match notes via frontmatter links: `src/utils/`
  - Helpers to create pre-linked artifacts: e.g. `createMeetingForEntity`(`src/utils/createMeetingForPerson.ts`)

## Step-by-Step: Add a Custom Panel

### 1) Create your panel component

Location: `src/containers/EntityLinks/panels/<YourPanel>.tsx`

Component contract:

- Props:
  - `file: TCachedFile` — the focused note
  - `config: Record<string, unknown>` — your config payload from the entity’s `links` array

Recommended skeleton:

```tsx
import { Card } from "@/components/ui/Card";
import type { TCachedFile } from "@/types/TCachedFile";

type MyCustomLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

export const MyCustomLinks = ({ file, config }: MyCustomLinksProps) => {
  const title = "My Custom Panel";
  const subtitle = `For ${file.cache?.frontmatter?.show ?? file.file.basename}`;

  // Optionally: use useFiles, matchesPropertyLink, useApp, etc.

  return (
    <Card
      collapsible
      collapsed={Boolean((config as any)?.collapsed)}
      icon="puzzle"
      title={title}
      subtitle={subtitle}
    >
      <div className="text-sm text-[var(--text-muted)]">
        Hello from MyCustomLinks
      </div>
    </Card>
  );
};
```

Tips:

- Use `Card`’s `collapsible` and `collapsed` props to match existing UX.
- Use Tailwind utility classes; Obsidian theme variables handle colors.

### 2) Register the component type in the EntityLinks registry

Open `src/containers/EntityLinks/EntityLinks.tsx` and:

- Import your component.
- Add a key to `entityMap` with your chosen type string.

Example:

```tsx
import { MyCustomLinks } from "./panels/MyCustomLinks";

const entityMap: Record<string, React.ComponentType<LinkPanelProps>> = {
  // existing entries...
  "my-custom": MyCustomLinks,
};
```

The string key (e.g. `"my-custom"`) is what entity configs will reference.

### 3) Add it to an entity configuration

Open `src/crm-config.json`, locate the target entity, and append your link object to its `links` array:

```jsonc
"links": [
  { "type": "meetings" },
  { "type": "projects" },

  { "type": "my-custom", "collapsed": true, "foo": "bar" }
]
```

Repeat for other entities if you want the same panel elsewhere. Because the JSON is loaded directly at runtime, make sure you keep the structure valid and property names aligned with `CRMEntityConfig`.

## Example: Add a "Contacts" panel to Company

1. Create `src/containers/EntityLinks/panels/ContactsLinks.tsx` using the skeleton.
2. Register it in `EntityLinks.tsx`:
   - `import { ContactsLinks } from "./panels/ContactsLinks";`
   - `entityMap["contacts"] = ContactsLinks;`
3. Edit `src/crm-config.json`:
   - Inside the `"company"` entity, append `{ "type": "contacts", "collapsed": true }` to `links`.
4. Start dev server and open a company note to verify.

## Advanced Patterns

- Accessing the focused file:
  - `const { file } = useEntityFile();` (already provided to your panel via props)
  - Frontmatter: `file.cache?.frontmatter`
- Querying related notes:
  - `useFiles(CRMFileType.PERSON, { filter: (cached) => matchesPropertyLink(cached, "company", file.file) })`
- Creating linked artifacts:
  - See `MeetingsLinks.tsx` for a full example using `createMeetingForEntity` to make a meeting pre-linked to the current entity.
- Card actions (buttons in panel header):
  - Pass `actions=[{ key, content: <Button ... /> }]` to `Card` like in `MeetingsLinks.tsx`.
- Icons:
  - Use existing icon names (lucide) already used across the project, e.g. `calendar`, `puzzle`, `users`, etc.
- Backlinks panel:
  - Legacy bespoke panels have been consolidated into the configurable Backlinks renderer (`type: "backlinks"`). See [`BACKLINKS_PANEL.md`](./BACKLINKS_PANEL.md) for full schema and examples.

## Troubleshooting

- "EntityLinks: current file is missing a frontmatter type"
  - Add `type: <entity>` to the file’s frontmatter.
- "EntityLinks: unknown entity type"
  - The `type` in frontmatter must match one of `CRM_ENTITY_TYPES` (see `src/entities/index.ts`).
- "EntityLinks: no renderer registered for link type \"<x>\""
  - You added a `{ type: "<x>" }` to `links` but didn’t register it in `entityMap`.
- "EntityLinks: no link configuration defined for \"<entity>\""
  - The entity config has an empty `links` array. Add at least one link entry.
- Panel doesn’t collapse as expected
  - Ensure you pass `collapsed: true` in the entity `links` entry and wire `collapsed={(config as any)?.collapsed}` to `Card`.

## Development & Testing

- Start the dev server and watch:

```bash
yarn install
yarn dev
```

- Open a note with the target `type:` to see your panel.
- Reordering panels: change the order of entries in the entity’s `links` array.

## Reference: Important Files & APIs

- Injection and rendering:
  - `src/events/inject-crm-links.tsx`
  - `src/containers/EntityLinks/EntityLinks.tsx`
- Entity configuration:
  - `src/crm-config.json`
  - [`docs/CRM_CONFIG.md`](./CRM_CONFIG.md)
- Types:
  - `src/types/CRMEntityConfig.ts`
  - `src/types/CRMFileType.ts`
- Context & hooks:
  - `src/context/EntityFileProvider.tsx`
  - `src/hooks/use-files.ts`
- Utilities:
  - `src/utils/matchesPropertyLink.ts`
  - `src/utils/matchesAnyPropertyLink.ts`
  - `src/utils/createMeetingForPerson.ts` (contains `createMeetingForEntity`)

## Style Notes

- Follow the repository TypeScript and React conventions (see `AGENTS.md`).
- Keep components small and focused, colocate any subcomponents in a folder with `index.ts` re-exports.
- Use Tailwind utilities and Obsidian CSS variables for consistent theming.

---

With these steps, you can add robust, reusable panels to any CRM entity type with minimal wiring. If you share the target entity and desired functionality, we can scaffold a ready-to-run component for you.
