# Habit Tracker How-To

This guide walks through embedding Mondo habit trackers in your notes. We will start with the simplest possible block, then layer on configuration options until you can run a multi-tracker dashboard powered entirely by note frontmatter.

## 1. Core concept

Habit trackers are rendered by `mondo` Markdown code blocks. When you add a block with the `habits` identifier, Mondo stores the tracker state (checked days and the last selected view) in the note’s frontmatter under the tracker key.

- **Tracked days** are saved as ISO date strings (`YYYY-MM-DD`).
- **View preference** (`streak` or `calendar`) is stored alongside the data using the naming pattern `<key>-view`.
- If you do not specify a key, Mondo uses `habits` and therefore creates frontmatter entries named `habits` and `habits-view`.

Keeping this in mind will help you understand how to share data between blocks or notes.

## 2. Minimal tracker

Create a code block in any note:

````markdown
```mondo
habits
```
````

The first time the block loads, Mondo ensures the note’s frontmatter contains:

```yaml
habits: []
habits-view: streak
```

Clicking on calendar cells toggles dates in the `habits` list. Switching between streak and calendar mode updates `habits-view`.

## 3. Naming your tracker

To keep multiple trackers in the same note, assign each one a unique key. Provide the key with the `key` query parameter or as YAML.

### Inline query parameter

````markdown
```mondo
habits?key=meditation
```
````

### YAML body

````markdown
```mondo
habits
key: evening-routine
```
````

Both snippets create (and persist) frontmatter entries named `meditation`/`meditation-view` or `evening-routine`/`evening-routine-view` respectively.

## 4. Custom titles and layout hints

Add a `title` to display a heading above the tracker. You can use inline parameters, YAML, or a mix of both.

````markdown
```mondo
habits?key=movement
title: Daily Movement
```
````

Because the `habits` block understands both inline and YAML props, the example above sets the key via query string and the title via YAML.

## 5. Combining multiple trackers in a single note

You can compose a dashboard by stacking several configured blocks. Each one maintains its own state in frontmatter.

````markdown
```mondo
habits?key=meditation
title: Meditation
```

```mondo
habits
key: journaling
title: Journaling
```

```mondo
habits
key: workouts
title: Workouts
```
````

Behind the scenes your note frontmatter evolves into:

```yaml
meditation:
  - 2024-01-08
  - 2024-01-09
meditation-view: calendar
journaling: []
journaling-view: streak
workouts:
  - 2024-01-07
workouts-view: streak
```

Each block reads and writes only its own key, so their data stays isolated.

## 6. Preloading data or repairing frontmatter

If you need to seed a tracker with historical data, edit the note’s frontmatter manually. Supply a YAML list of dates in `YYYY-MM-DD` format:

```yaml
meditation:
  - 2023-12-31
  - 2024-01-01
  - 2024-01-02
```

Optionally force a default view by setting `<key>-view` to `streak` or `calendar`:

```yaml
meditation-view: calendar
```

The block normalizes dates and will sort them automatically the next time it writes to frontmatter.

## 7. Reusing a tracker from another note

The `notePath` prop lets you render the tracker defined in a different file—great for embedding a central habit log inside daily notes.

````markdown
```mondo
habits?key=meditation&notePath=Projects/Habits.md
```
````

In this example, the block reads and updates the `meditation` frontmatter stored in `Projects/Habits.md`, even though the block is rendered elsewhere. Make sure the path matches the note’s vault-relative path and that the destination note already contains the tracker frontmatter (or open it once so Mondo can initialize it).

## 8. Troubleshooting checklist

- **Block renders an error:** confirm the first line of the block is exactly `habits` (case-sensitive).
- **Changes are not saved:** ensure the note is not read-only and that Obsidian can write frontmatter for the file referenced by `notePath`.
- **Unexpected dates disappear:** the tracker keeps only valid strings; double-check that the frontmatter dates use the `YYYY-MM-DD` format.
- **View mode keeps reverting:** verify that `<key>-view` is either `streak` or `calendar`.

Once you understand how keys and frontmatter interplay, you can tailor trackers for any workflow—from a single daily streak to a vault-wide wellness dashboard.
