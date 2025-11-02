# Development Guide

## Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Deploy to Obsidian vault
yarn deploy
```

## Commands

### Development

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server with hot reload |
| `yarn build` | Build and lint the plugin |
| `yarn deploy` | Build and deploy to local Obsidian vault |

### Release & Publishing

#### Local Release (Manual)

```bash
yarn release
```

This command chains three operations:
1. Bumps version (prompts for version selection)
2. Pushes changes to `main` branch
3. Creates and pushes git tag

**Note**: This is useful for testing locally but doesn't create a GitHub release.

#### GitHub Release (Automated)

```bash
gh workflow run release.yml
```

This is the **recommended way** to create releases. It triggers the GitHub Actions workflow which:

1. ✅ Automatically bumps version (patch level)
2. ✅ Builds the plugin
3. ✅ Pushes version bump to `main`
4. ✅ Creates and pushes git tag
5. ✅ Creates a published GitHub release
6. ✅ Attaches build artifacts (main.js, manifest.json, styles.css)

### Syncing with Obsidian

```bash
yarn sync
```

Syncs files from your Obsidian vault to the development directory (one-way sync from vault to dev).

## Release Workflow

### Prerequisites

1. **GitHub CLI** installed and authenticated:

   ```bash
   # Check if installed
   gh --version

   # If not installed (macOS)
   brew install gh

   # Authenticate with GitHub
   gh auth login
   ```

2. **Verify authentication**:

   ```bash
   gh auth status
   ```

### Triggering a Release

1. **From the CLI**:

   ```bash
   # From anywhere in the project
   gh workflow run release.yml

   # Monitor the workflow in GitHub Actions
   # Go to: https://github.com/marcopeg/mondo/actions
   ```

2. **From GitHub Web UI**:
   - Go to: https://github.com/marcopeg/mondo/actions
   - Select "Release Obsidian plugin" workflow
   - Click "Run workflow" button
   - Select branch: `main`
   - Click "Run workflow"

### What Happens Automatically

When you trigger the release workflow:

1. **Version Bump**: Automatically increments patch version (e.g., 0.0.33 → 0.0.34)
2. **Build**: Runs `npm run build` to compile the plugin
3. **Commit**: Creates a commit with updated version files
4. **Tag**: Creates a git tag matching the new version
5. **Release**: Creates a GitHub release (published, not draft)
6. **Artifacts**: Attaches compiled files to the release:
   - `main.js` - Compiled plugin code
   - `manifest.json` - Plugin manifest
   - `styles.css` - Plugin styles

### Workflow Files

- **`.github/workflows/release.yml`**: Main release workflow (triggered manually via `workflow_dispatch`)

**Note**: The old automatic tag-push trigger has been disabled. Use the manual workflow instead.

## Project Structure

```
src/
  commands/           # CLI commands
  components/        # React UI components
  containers/        # Stateful components
  context/          # React context providers
  entities/         # Entity type definitions
  events/           # Event listeners and DOM injections
  examples/         # Usage examples
  hooks/            # Custom React hooks
  types/            # TypeScript type definitions
  utils/            # Utility functions
  views/            # Page-level aggregations
  main.ts           # Plugin entry point
  styles.css        # Tailwind CSS entry point

docs/               # Documentation
.github/workflows/  # GitHub Actions workflows
```

## TypeScript & Code Style

- ✅ Prefer arrow functions `() => {}`
- ✅ Default to `const`; use `let` only when mutation is required
- ✅ Never use `var`
- ✅ Never use the `any` type
- ✅ Do not use the `function` keyword for declarations

## React Guidelines

- UI components implement a single visual control
- Containers bridge hooks/business logic with UI
- Views coordinate multiple containers and components
- Reuse shared `ui/Cover` component for thumbnails
- Use Tailwind CSS and Obsidian theming

## Daily Note Commands

The plugin provides several commands for working with daily notes:

| Command | ID | Description |
|---------|----|----|
| Append to Daily note | `add-log` | Core command - sets up daily note and positions cursor |
| Talk to Daily Note | `talk-to-daily` | Append to daily note + start dictation |
| Record to Daily Note | `record-to-daily` | Append to daily note + start native recording |

All three commands use the same core logic (`setupDailyLogAndPositionCursor`) for consistency.

## Troubleshooting

### GitHub CLI Not Found

If you get "command not found: gh", install it:

```bash
# macOS
brew install gh

# Then authenticate
gh auth login
```

### Workflow Failed

Check the workflow logs:

1. Go to: https://github.com/marcopeg/mondo/actions
2. Click on the failed workflow run
3. Click on the "build" job to see detailed logs

### Version Already Bumped

If the version was already bumped locally, you can:

```bash
# Undo local changes
git reset --hard

# Or pull latest from main
git pull origin main
```

## Useful Links

- [Obsidian Sample Plugin](https://github.com/obsidianmd/sample-plugin)
- [Obsidian Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [GitHub CLI Documentation](https://cli.github.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
