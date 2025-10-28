# Mondo File Manager Optimization

## Overview

The original `useFiles()` hook was hitting the filesystem on every usage and performing filtering each time, which was inefficient when multiple components needed to access Mondo files simultaneously (e.g., both sidebar and main panel).

## Solution

I've implemented a singleton-based file management system that provides the following optimizations:

### 1. **Singleton Mondo File Manager** (`src/utils/MondoFileManager.ts`)

- **Single source of truth**: Maintains an in-memory cache of all Mondo files
- **Event-driven updates**: Listens to filesystem changes and updates cache automatically
- **Efficient filtering**: Pre-categorizes files by type during scanning
- **Memory optimization**: Only scans once, then reuses cached data

### 2. **Mondo File Types** (`src/types/MondoFileType.ts`)

- **Type safety**: Enum defining all valid Mondo file types
- **Extensible**: Easy to add new types (currently: person, company, project, idea, team)
- **Type guards**: Runtime validation of file types

### 3. **Optimized Hooks**

#### `useMondoFiles()` (`src/hooks/use-mondo-files.ts`)

- Uses the singleton file manager for Mondo file types
- Subscribes to change events for reactive updates
- Maintains the same API as the original hook

#### Updated `useFiles()` (`src/hooks/use-files.ts`)

- **Backward compatible**: Existing code works without changes
- **Smart routing**: Mondo types use optimized path, others use legacy path
- **Performance**: Zero filesystem hits for Mondo types after initial scan

### 4. **Plugin Integration**

- **Lifecycle management**: File manager initializes on plugin load, cleans up on unload
- **Settings support**: All Mondo file types included in settings panel
- **Event handling**: Proper cleanup of event listeners to prevent memory leaks

## Performance Benefits

### Before

- Multiple `useFiles()` calls → Multiple filesystem scans
- Each component filters independently → Redundant work
- No caching → Repeated file system access

### After

- Single filesystem scan on initialization → One-time cost
- Shared cache across all components → Zero redundant work
- Event-driven updates → Minimal filesystem monitoring overhead
- Pre-filtered by type → Instant filtering results

## Usage

The API remains unchanged for existing code:

```tsx
// This now uses the optimized path automatically
const companies = useFiles("company");
const people = useFiles("person", {
  filter: (file, app) => /* custom filter */
});
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   useFiles()    │    │ MondoFileManager   │    │  Obsidian FS    │
│                 │    │   (Singleton)    │    │     Events      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Mondo types     │───▶│ • In-memory      │◀───│ • file changes  │
│   use optimized │    │   cache          │    │ • metadata      │
│ • Other types   │    │ • Event listeners│    │   updates       │
│   use legacy    │    │ • Change events  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Components     │
                       │                  │
                       │ • Dashboard      │
                       │ • Sidebar        │
                       │ • EntityLinks    │
                       └──────────────────┘
```

## File Structure

```
src/
├── types/
│   ├── MondoFileType.ts          # Enum and type guards
│   └── TCachedFile.ts          # Existing cached file type
├── utils/
│   └── MondoFileManager.ts       # Singleton file manager
├── hooks/
│   ├── use-mondo-files.ts        # Optimized hook for Mondo types
│   └── use-files.ts            # Updated to route to optimized path
└── main.ts                     # Plugin lifecycle integration
```

## Benefits Summary

1. **Performance**: Dramatic reduction in filesystem access
2. **Scalability**: Adding more Mondo file types has minimal overhead
3. **Consistency**: All components see the same data simultaneously
4. **Reactivity**: Changes propagate instantly to all consumers
5. **Memory**: Efficient caching with proper cleanup
6. **Compatibility**: Existing code works without modification

## Future Enhancements

- **Lazy loading**: Only load files for types that are actually used
- **Debounced updates**: Batch rapid filesystem changes
- **Persistence**: Cache to disk for faster startup
- **Analytics**: Track usage patterns for further optimization
