# 📈 How to use the Habit Tracker

This guide walks through embedding Mondo habit trackers in your notes.

We will start with the simplest possible block, then layer on configuration options until you can run a multi-tracker dashboard powered entirely by note frontmatter.

## 1. Core concept

Habit trackers are rendered by `mondo` Markdown code blocks. 

When you add a block with the `habits` identifier, Mondo stores the tracker state (checked days and the last selected view) in the note’s frontmatter under the tracker key.

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

> You don't have to do anything about this, it's automatic!

## 3. Naming your tracker

To keep multiple trackers in the same note, assign each one a unique key. Provide the key with the `key` query parameter or as YAML.

### Inline query parameter

````markdown
```mondo
habits?key=meditation
```
````

### YAML variant

````markdown
```mondo
habits
key: evening-routine
```
````

You can use both queryString style ad YAML definition blocks.

## 4. Custom Titles

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
