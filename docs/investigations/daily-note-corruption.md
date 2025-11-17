# Daily note data corruption investigation

The daily note corruption stems from the `DailyNoteTracker` utility that
collects file activity and rewrites a daily note's frontmatter while it
runs. The tracker creates or opens the day's daily note, enforces
`mondoType: daily`, and initializes a `mondoState` block that contains
`created`, `changed`, and `opened` arrays before any data is recorded.
These writes happen inside `getOrCreateDailyNote`, which builds the
frontmatter template, and `ensureDailyNoteMetadata`, which overwrites the
note's type and date keys.

Once a note is found, the tracker migrates and reshapes the entire
`frontmatter.mondoState` object inside `ensureDailyNoteState`. That
method deletes legacy keys such as `dailyNote`, `createdToday`, and
`modifiedToday` and replaces any non-object `mondoState` value with a new
object, meaning existing `mondoState` content is rewritten whenever the
tracker touches a file.

Finally, the tracker adds `created`, `changed`, or `opened` entries when
files are created, modified, or opened during the day. The
`recordCreatedNote`, `recordChangedNote`, and `recordOpenedNote` handlers
all call `processFrontMatter` to mutate `frontmatter.mondoState`, pushing
new link records and re-serializing the arrays on every event. If the
frontmatter shape is unexpected, these handlers will still normalize and
persist their own structure, leading to the corrupted `mondoState` block
seen in daily notes while information is being gathered.
