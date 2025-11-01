# Development Workflow

This plugin runs inside the Obsidian Electron app.

```bash
# Install dependencies
yarn install

# Lint & build (validate a change without starting the dev server)
yarn build

# Continuous development
yarn dev
```

# Plugin Overview

Mondo enriches Obsidian by rendering React views around the standard Markdown experience.

- Frontmatter drives the plugin. When a note declares a `type` listed in `src/mondo-config.json`, Mondo treats it as a first-class entity and unlocks custom UI.
- Entity behaviour (tiles, quick search, link panels, templates) is defined centrally in the JSON config. Refer to [`docs/MONDO_CONFIG.md`](./docs/MONDO_CONFIG.md) and [`docs/ENTITY_LINKS.md`](./docs/ENTITY_LINKS.md) for maintenance guidelines.

# TypeScript Guidelines

- Prefer arrow functions `() => {}`.
- Default to `const`; use `let` only when mutation is required.
- Never use `var`.
- Never use the `any` type.
- Do not use the `function` keyword for declarations.

# React Structure

```
src/
  types/           # Domain types
  utils/           # Generic utilities
  hooks/           # Reusable React hooks
  components/      # Presentational components
    ui/            # Shared UI building blocks
  containers/      # Stateful components (fetch/use hooks)
  views/           # Page-level aggregations
```

- UI components implement a single visual control (button, grid, text field, etc.).
- Containers bridge hooks/business logic with UI. Shared presentation pieces belong in `src/components`; bespoke pieces can live next to their container.
- Views coordinate multiple containers and components to build full experiences.

## Component Conventions

```
ComponentName/
  index.ts          # `export { ComponentName as default } from "./ComponentName";`
  ComponentName.tsx # `export const ComponentName = () => { ... }`
  useFeature.ts     # Optional hooks
  SubComponent/
    ...
```

Keep files short and respect single-responsibility boundaries. Tailwind is available via `src/styles.css`; stay aligned with Obsidian theming.

# Obsidian Integration

```
src/
  main.ts    # Plugin entry point
  styles.css # Tailwind entry point
  commands/  # Registered Obsidian commands
  events/    # Event listeners / DOM injections
```

## Commands

```
yarn dev      # Start development server
yarn build    # Lint and build distributable assets
yarn version  # Bump release version
```

# Entity Notes

Entity behaviour is split across multiple components under `src/containers/EntityHeader`:

- `EntityHeader.tsx` remains a light delegator: detect the current note type, verify against the configured entities, and pick `EntityHeaderMondo` (known type) or `EntityHeaderUnknown` (unknown type). If no entities are configured, return `null`.
- `EntityHeaderMondo.tsx` renders the complete header for known entities (cover preview, metadata, “Add Related” actions) and fetches its own data through hooks.
- `EntityHeaderUnknown.tsx` mirrors the layout while encouraging users to convert the note via the “Create as Mondo Note” actions.

Each sub-component owns its data requirements so `EntityHeader` stays presentation-agnostic.

# Hooks Reference

- `src/hooks/use-app.ts` exposes the Obsidian `App` object to React components.
- `src/hooks/use-setting.ts` returns a plugin setting by key with an optional default (`const foo = useSetting("foo", "bar");`).
- `src/hooks/use-files.ts` loads vault files filtered by entity type and optional predicates (`const files = useFiles("person");`).
