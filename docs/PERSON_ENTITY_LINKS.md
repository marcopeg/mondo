# Person Entity Links Fix Postmortem

## What went wrong?
- New person notes did not show any of the expected link panels because the tasks panel aborted rendering when the note had not yet been saved, so the UI rendered nothing for the most visible section.
- Meeting links only rendered when matching notes existed, which made the Meetings section disappear entirely for people without recorded meetings.
- All of the required panels (Projects, Tasks, Facts, Meetings) were collapsed by default in the entity configuration, obscuring the empty states that would otherwise reassure users the sections were available.

## How was it fixed?
- The participant tasks panel now renders an instructional empty state even before a note has a backing file, while continuing to list and reorder linked tasks once one exists.
- Meetings always render through `MeetingsTable`, which now supports a custom empty label so the card shows "No meetings yet" instead of vanishing.
- The person entity configuration forces the Projects, Tasks, Facts, and Meetings panels to load expanded, so brand-new notes immediately surface all four sections.

## How do we avoid this next time?
- When adding or refactoring Entity Link panels, verify both the "happy path" (links exist) and the "empty state" (no links yet) inside Obsidian so panels never disappear silently.
- Prefer explicit empty-state rendering over returning `null` so users always see the section headers they expect.
- Document any required panels per-entity and keep a manual QA checklist to confirm new notes render all mandated sections after changes to entity configs or link panels.
