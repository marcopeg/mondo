# Dynamic Links Panels — How to Add Custom Components

This guide explains how to add custom panels to CRM entity notes using the DynamicEntityLinks system. These panels show up inline when viewing a note with a CRM entity `type` in frontmatter, e.g. `type: person`.

- Injected area is created by the plugin when opening a Markdown file: see `src/events/inject-crm-links.tsx`.
- For CRM entity types, it renders `DynamicEntityLinks`: `src/containers/DynamicEntityLinks/DynamicEntityLinks.tsx`.
- The set of panels shown for a given entity type is controlled by that entity’s config: `src/entities/<entity>.ts` as `links: [...]`.

If you want to add a new panel, you’ll create a component, register it in a central registry, and reference it from the target entity’s `links` list.

## Architecture Overview

- Rendering entrypoint: `inject-crm-links.tsx`
  - Determines the current file and its frontmatter `type`.
  - For CRM types, renders `<DynamicEntityLinks />` within React providers (`AppProvider` + `EntityFileProvider`).
- Dynamic renderer: `src/containers/DynamicEntityLinks/DynamicEntityLinks.tsx`
  - Reads the focused file via `useEntityFile()`.
  - Loads the entity config from `CRM_ENTITIES`.
  - Iterates `entityConfig.links` and, for each item `{ type: string, ...config }`, picks a component from `entityMap[type]`.
  - If a type is not registered in `entityMap`, it shows an InlineError.
- Entity configs: `src/entities/*.ts`
  - Define `links: TLink[]` where `TLink` is a union of link configuration shapes, e.g. `{ type: "meetings"; collapsed?: boolean }`.
  - You can add your own `{ type: "my-custom"; ... }` link entry.

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

Location: `src/containers/DynamicEntityLinks/<YourPanel>.tsx`

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

### 2) Register the component type in the Dynamic registry

Open `src/containers/DynamicEntityLinks/DynamicEntityLinks.tsx` and:

- Import your component.
- Add a key to `entityMap` with your chosen type string.

Example:

```tsx
import { MyCustomLinks } from "./MyCustomLinks";

const entityMap: Record<string, React.ComponentType<LinkPanelProps>> = {
  // existing entries...
  "my-custom": MyCustomLinks,
};
```

The string key (e.g. `"my-custom"`) is what entity configs will reference.

### 3) Add it to an entity configuration

Open the entity config file, e.g. `src/entities/person.ts` (or `company.ts`, `project.ts`, etc.).

- Add your link entry to the `links` array:

```ts
links: [
  // existing panels
  { type: "meetings" },
  { type: "projects" },

  // your custom panel
  { type: "my-custom", collapsed: true, foo: "bar" },
],
```

- Optional but recommended: extend the `CRMEntityConfig` generic union for strong typing and autocompletion:

```ts
const personConfig: CRMEntityConfig<
  "person",
  | { type: "teammates"; collapsed?: boolean }
  | { type: "meetings"; collapsed?: boolean }
  | { type: "projects"; collapsed?: boolean }
  | { type: "facts"; collapsed?: boolean }
  | { type: "my-custom"; collapsed?: boolean; foo?: string }
> = {
  // ...
};
```

Repeat for other entities if you want the same panel elsewhere.

## Example: Add a "Contacts" panel to Company

1. Create `src/containers/DynamicEntityLinks/ContactsLinks.tsx` using the skeleton.
2. Register it in `DynamicEntityLinks.tsx`:
   - `import { ContactsLinks } from "./ContactsLinks";`
   - `entityMap["contacts"] = ContactsLinks;`
3. Edit `src/entities/company.ts`:
   - Extend the `CRMEntityConfig` union with `| { type: "contacts"; collapsed?: boolean }`.
   - Add `{ type: "contacts", collapsed: true }` to `links`.
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

## Troubleshooting

- "DynamicEntityLinks: current file is missing a frontmatter type"
  - Add `type: <entity>` to the file’s frontmatter.
- "DynamicEntityLinks: unknown entity type"
  - The `type` in frontmatter must match one of `CRM_ENTITY_TYPES` (see `src/entities/index.ts`).
- "DynamicEntityLinks: no renderer registered for link type \"<x>\""
  - You added a `{ type: "<x>" }` to `links` but didn’t register it in `entityMap`.
- "DynamicEntityLinks: no link configuration defined for \"<entity>\""
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
- Note: If a config doesn’t include a `participant-tasks` panel, the system adds one automatically at the end.

## Reference: Important Files & APIs

- Injection and rendering:
  - `src/events/inject-crm-links.tsx`
  - `src/containers/DynamicEntityLinks/DynamicEntityLinks.tsx`
- Entity configs:
  - `src/entities/*.ts` (e.g. `person.ts`, `company.ts`)
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
