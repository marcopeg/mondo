# Handling `mondoState` references on note rename

## Background

The plugin persists UI state for entity link panels and other widgets under the `mondoState` object in a note's frontmatter. For
example, manual drag-and-drop sorting writes an array of note paths to `mondoState["backlinks:{key}"].order` so the UI can recons
truct the custom order on reload.【F:docs/BACKLINKS_PANEL.md†L277-L334】

Obsidian automatically updates Markdown wikilinks when a note is renamed, but it does **not** update JSON payloads stored inside
frontmatter. As a result, any reference to another note that is saved inside `mondoState` becomes stale after the target note is re
named.

## Problem statement

1. Users reorder backlinks or other entity lists; the plugin stores the note paths inside `mondoState`.
2. When a linked note is renamed, Obsidian updates wikilinks in Markdown bodies but leaves the JSON strings inside `mondoState` unchanged.
3. The stale path prevents the renamed note from matching the stored order entry, so the UI falls back to default ordering and the manual sort appears to "forget" the renamed note.

We need a strategy to extend the plugin so `mondoState` references stay in sync with note renames.

## Solution options

### Option A – Vault-wide scan on rename

Hook the `app.vault.on("rename")` event, iterate every note in the vault, parse its frontmatter, and rewrite any `mondoState` va
lue that matches the old path.

*Pros*

- Straightforward to implement.
- Guarantees all references are updated in one pass.

*Cons*

- Linear scan across large vaults on every rename is expensive.
- Requires parsing frontmatter for all notes even if only a few store references.
- More disk churn because we reprocess every note whether it needs updates or not.

### Option B – Maintain a `mondoState` reference index (recommended)

Build an in-memory index that maps target note paths to the set of host notes and keys that reference them inside `mondoState`.

Implementation outline:
1. During plugin load, and on `metadataCache` `resolved` / `changed` events, inspect frontmatter for each note and record all
   string values nested under `mondoState` that look like vault paths.
2. Store the relationships in a structure such as `Map<targetPath, Array<{ host: TFile; keyPath: string[] }>>`.
3. On `rename`, look up the old path in the index. For each host entry, call `fileManager.processFrontMatter` to replace the
   stored string(s) with the new path.
4. Update the index entry to point to the new path so future renames remain accurate.

*Pros*

- Updates only the notes that actually contain the renamed path.
- Keeps runtime cost bounded by the number of affected references rather than total vault size.
- Reuses existing Obsidian APIs (`processFrontMatter`) for safe writes.

*Cons*

- Requires additional bookkeeping to keep the index in sync when notes change or are deleted.
- Slightly higher implementation complexity.

### Option C – Migrate to stable identifiers instead of file paths

Persist a stable identifier (e.g., a generated UUID stored in the target note's frontmatter) in `mondoState` instead of the path.
Display logic would look up notes by identifier, and rename would not affect stored values.

*Pros*

- Eliminates rename sensitivity entirely once every note has a stable ID.
- Could simplify future cross-note references beyond ordering.

*Cons*

- Requires a migration strategy to assign IDs to all existing notes and convert stored orders.
- UI and sorting hooks must learn to translate IDs back to `TFile` instances, increasing complexity.
- Backwards compatibility with existing vaults must be managed carefully.

## Recommended approach

Option B offers the best balance between performance and maintainability. It contains the rename work to the small set of notes
that actually reference the renamed file and avoids the heavy-handed vault scans of Option A. Compared with Option C, it delivers a
fix without a sweeping data model change or migration effort.

Key implementation considerations:
- Normalize stored paths (e.g., ensure consistent casing and use forward slashes) before indexing so comparisons succeed.
- Watch `metadataCache` events to keep the index accurate when notes are edited, created, or deleted. Remove entries for hosts or
  targets that no longer exist.
- During rename handling, guard against the host file being renamed in the same event (the index should update both host and target
  references).
- Log errors but fail gracefully if `processFrontMatter` cannot update a particular note to avoid blocking the rename event.

Deliverables for the implementation should include unit or integration tests (where feasible) and manual QA instructions covering
rename flows to ensure the stored order survives note renames.
