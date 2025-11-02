# Timestamp How-To Guide

Mondo's timestamp feature lets you drop pre-formatted date and time markers anywhere in your vault. This guide walks you from the default setup to advanced configurations so you can tailor the output for daily journals, meeting notes, or structured logs.

## 1. Minimal Usage

1. Open any Markdown note.
2. Run **Insert timestamp** from the command palette (or assign it a hotkey in the Obsidian settings).
3. A timestamp is inserted at the cursor using the current template and, by default, followed by a blank line.

> Tip: On mobile, Mondo adds an **Add timestamp** button to the editor toolbar so you can insert timestamps with a single tap.

## 2. Understanding the Default Output

Out of the box, timestamps follow the format:

```text
YYYY-MM-DD HH:mm
```

The result looks like `2024-03-15 09:42`. A newline is appended automatically to keep your log entries spaced apart.

## 3. Configuring the Timestamp Template

1. Open **Settings → Community Plugins → Mondo → Timestamps**.
2. Update the **Template** field with any [Moment.js](https://momentjs.com/docs/#/displaying/format/) style pattern.
3. Toggle **Add newline after timestamp** if you prefer to keep the cursor on the same line.
4. The **Preview** section shows how your template renders with the current date and time.

### Common Template Tokens

| Token | Meaning | Example Output |
| ----- | ------- | -------------- |
| `YYYY` | Four-digit year | `2024` |
| `MM` | Month number with leading zero | `03` |
| `DD` | Day of month | `15` |
| `HH` | Hours (24-hour clock) | `09` |
| `hh` | Hours (12-hour clock) | `09` |
| `mm` | Minutes | `42` |
| `ss` | Seconds | `08` |
| `ddd` | Day of week abbreviation | `Fri` |

Combine these tokens to suit your workflow. For example:

```text
ddd, MMM DD · HH:mm
```

produces `Fri, Mar 15 · 09:42`.

## 4. Adding Headings, Bullets, and Tags

You can mix literal text with Moment tokens to integrate timestamps into note structures.

### Headings

```text
## [Log] YYYY-MM-DD HH:mm
```

> Square brackets mark literal text in Moment templates. The brackets themselves are not shown in the output.

### Bullet Lists

```text
- HH:mm — [📌] ddd
```

renders as `- 09:42 — 📌 Fri`, perfect for chronological bullet logs.

### Tagged Entries

```text
YYYY-MM-DD HH:mm [#journal #daily]
```

Result: `2024-03-15 09:42 #journal #daily`.

## 5. Controlling Newlines and Multi-line Layouts

The **Add newline after timestamp** toggle controls whether a blank line is inserted automatically. For multi-line patterns, you can also embed explicit line breaks using `\n` inside the template:

```text
## YYYY-MM-DD
HH:mm
```

This example yields:

```
## 2024-03-15
09:42
```

Disable the trailing newline if you want the cursor to remain directly after the second line.

## 6. Restoring Defaults

Clear the **Template** field or replace it with `YYYY-MM-DD HH:mm`, then enable **Add newline after timestamp**. The preview updates instantly so you can confirm the change.

## 7. Troubleshooting

- **Nothing happens when the command runs.** Ensure the active pane is a Markdown editor (Obsidian cannot insert into PDFs or Canvas).
- **Template trims spaces I need.** Leading/trailing spaces are automatically stripped. Wrap intentional spaces or symbols in brackets, for example `[  ]`.
- **Literal brackets disappear.** Escape them by doubling: use `[[` for `[` and `]]` for `]` in the final output.

With these patterns you can evolve from a simple timestamp to rich, structured entries that match any capture workflow.
