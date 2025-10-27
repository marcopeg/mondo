# Development

This is an Obsidian plugin and runs inside an Electron app.

```bash
# Install dependencies
yarn install

# Lint & Build
# (useful to check if a change builds without errors)
yarn build

# Continuous Development
yarn dev
```

# CRM Obsidian Plugin

This codebase implements an Obsidian Plugin for CRM purposes.
The goal is to enrich Obsidian UI with lists of related notes by context (such as `People` associated with a `Company`).

## FrontMatter

This plugin relies on the frontmatter's attribute `type` to identify CRM-specific files and activate the rich UI functionalities.

## Entities

Supported values for the `type` frontmatter field are defined in [`src/crm-config.json`](./src/crm-config.json).  
Current entity types:

- person
- fact
- log
- task
- project
- idea
- company
- team
- meeting
- role
- location
- restaurant
- gear
- tool
- recipe
- book
- show
- document

The config also drives dashboard tile ordering, relevant-note filters, and per-entity templates. See [`CRM_CONFIG.md`](./docs/CRM_CONFIG.md) for details on maintaining the configuration, and [`ENTITY_LINKS.md`](./docs/ENTITY_LINKS.md) for link panel guidance.

# TypeScript

## Do

- Use arrow functions `() => {}`
- Prefer `const` over `let` unless necessary

## Dont

- Never use `var`
- Never use type `any`
- Never use the keyword `function`

# React

## Folder Structure

```
src/
  types/           # TypeScript types
  urils/           # generic libraries
  hooks/           # reusable react hooks
  components/      # reusable dumb components
    ui/            # UI specific reusable components
  containers/      # state-aware components
  views/           # aggregation components for complex UI/UX
```

## UI Components

A UI component implements a visual control, such as a Button, grid, or text field.

## Containers

Containers are the connection between business logic and UI.
If the presentational layer (UI) is shared with other containers (like a customizable List), it should be placed into `src/components`; else, it is a specific UI component and should be placed within the Container's folder structure.

The business logic must be abstracted away into custom hooks placed along the container.

One or more Views can use a container.

## Views

Page-level components that usually aggregate multiple Containers and Components.

## Component Structure

Components must be structured as:

```
- ComponentName/
  - index.ts
  - ComponentName.tsx
  - useCustomStuff.ts (optional hooks)
  - SubComponent/
    - ... same structure recursively
```

```ts
// index.ts
export { ComponentName as default } from "./ComponentName";
```

```tsx
// ComponentName/ComponentName.tsx
export const ComponentName = () => { ... }
```

Aim for the best possible granularity of component structure.
Files should be short and strictly respectful of the Single Responsibility Principle.

## Styles

Tailwind is enabled and configured in the codebase so we can use all the basic classes. The entry point is `src/styles.css`.

All the components must follow Obsidian guidelines for any theme-related properties such as colors, spacing, etc.

# Obsidian Plugin

## Folder Structure

```
src/
  main.ts    # Plugin entry point
  styles.css # CSS entrypoint (Tailwind enabled)
  commands/  # Register logic as an Obsidian Command
  events/    # Associated logic to an Obsidian Event
```

## Commands

```bash
yarn dev     # start the development server
yarn build   # lint and build the artifacts
yarn version # bump the release version
```

# Plugin Utilities

## src/hooks/use-app.ts

This hook gives access to the Obsidian context from a React Component perspective.

It return an instance of the Obsidian's App object:

```ts
import type { App } from "obsidian";
export const useApp = (): App { ... }
```

## src/hooks/use-setting.ts

This hook gives access to one of the plugin settings providing the setting's path and an optional default value:

```ts
const foo = useSetting("foo", "bar");
```

## src/hooks/use-files.ts

This hook returns a list of vault files filtered by a CRM-known entity type.

The second argument, `options`, can be used to apply filters or other hook-specific logic.

```ts
const files = useFiles("person");
```
