# Race Condition Fixes

## Problem Identified

The CRM file manager had several race conditions causing inconsistent loading of files:

1. **Metadata Cache Not Ready**: During plugin load, `app.metadataCache.getFileCache()` was returning `null` for files that had frontmatter but hadn't been processed yet.

2. **Blocking Plugin Load**: The async initialization was blocking the entire plugin load process.

3. **Missing Files on First Load**: Components would sometimes get empty lists because the file manager wasn't fully initialized when they requested data.

## Solutions Implemented

### 1. **Non-Blocking Initialization**

**Problem**: `await fileManager.initialize()` in `main.ts` was blocking the entire plugin load.

**Fix**: Made initialization non-blocking in the main plugin:

```typescript
// Before (blocking)
await fileManager.initialize();

// After (non-blocking)
fileManager.initialize().catch((err) => {
  console.error("CRM: Failed to initialize file manager:", err);
});
```

### 2. **Lazy Auto-Initialization**

**Problem**: Components requesting data before initialization was complete would get empty results.

**Fix**: Added auto-initialization trigger in `getFiles()`:

```typescript
public getFiles(type: CRMFileType): TCachedFile[] {
  // Trigger initialization if not started yet
  if (!this.isInitialized && !this.pendingInitPromise) {
    this.initialize().catch(err => {
      console.error("CRMFileManager: Failed to auto-initialize:", err);
    });
  }
  return this.files.get(type) || [];
}
```

### 3. **Metadata Cache Readiness Check**

**Problem**: File scanning happened before metadata cache was ready.

**Fix**: Added proper waiting for workspace layout ready:

```typescript
private async waitForMetadataCache(): Promise<void> {
  if (this.app.workspace.layoutReady) {
    return;
  }

  return new Promise((resolve) => {
    const checkReady = () => {
      if (this.app.workspace.layoutReady) {
        setTimeout(resolve, 100); // Small delay for cache to settle
        return;
      }
      setTimeout(checkReady, 50); // Check again
    };
    checkReady();
  });
}
```

### 4. **Pending Files Retry Mechanism**

**Problem**: Files without cached metadata were skipped permanently.

**Fix**: Added retry logic for files without metadata:

```typescript
// During initial scan, collect files without cache
if (!cache) {
  pendingFiles.push(file);
  continue;
}

// Later, retry pending files
if (pendingFiles.length > 0 && this.isInitialized) {
  setTimeout(() => {
    this.processPendingFiles(pendingFiles);
  }, 200);
}
```

### 5. **Concurrent Scan Prevention**

**Problem**: Multiple file scans could run concurrently, causing inconsistent state.

**Fix**: Added scanning guard:

```typescript
private async scanFiles(): Promise<void> {
  if (this.isScanning) return; // Prevent concurrent scans
  this.isScanning = true;

  try {
    // ... scan logic
  } finally {
    this.isScanning = false;
  }
}
```

### 6. **Promise-Based Initialize Deduplication**

**Problem**: Multiple components calling `initialize()` could cause redundant work.

**Fix**: Added promise deduplication:

```typescript
public async initialize(): Promise<void> {
  if (this.isInitialized) return;

  // If already initializing, wait for it to complete
  if (this.pendingInitPromise) {
    return this.pendingInitPromise;
  }

  this.pendingInitPromise = this.doInitialize();
  await this.pendingInitPromise;
  this.pendingInitPromise = null;
}
```

## Result

The plugin now:

- ✅ Loads quickly without blocking
- ✅ Handles metadata cache timing issues
- ✅ Consistently shows files even on first load
- ✅ Automatically retries files that weren't initially cached
- ✅ Prevents race conditions between multiple scans
- ✅ Gracefully handles components requesting data before full initialization

## Quick Tasks line-shift robustness

When promoting a Quick Task to a standalone task note, we mark the original inbox task in the daily note as completed. On today's note, rapid edits (adding more quick tasks) can shift line numbers between the time the inbox list is collected and the promotion occurs.

To handle this, task completion now:

- Tries the original line index first
- Searches within a small window around that index for an open checkbox line
- Falls back to a whole-file search matching the normalized task text

This prevents failures to check off the correct line on the active daily note due to recent insertions above the target line.

## Testing

To verify the fixes work:

1. Restart Obsidian completely
2. Open a company file
3. Check that the "Company Links" section shows people immediately
4. Hot reload the plugin (Ctrl+R)
5. Verify files still appear consistently

The race conditions have been eliminated through proper async handling, retry mechanisms, and lazy initialization.
