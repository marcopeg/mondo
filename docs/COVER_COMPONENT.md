# `ui/Cover`

The `ui/Cover` component centralizes every cover thumbnail used across the plugin. It handles
placeholder rendering, media selection, and the edit affordance for existing covers so we no
longer sprinkle bespoke `<img>` wrappers or hidden `<input>` elements throughout the codebase.

## Usage

Import the component with the UI alias:

```tsx
import { Cover } from "@/components/ui/Cover";
```

Render it anywhere a cover thumbnail is required:

```tsx
<Cover
  src={coverSrc}
  alt="Project cover"
  size={80}
  strategy="cover"
  placeholderIcon="briefcase"
  onSelectCover={(filePath, file) => {
    // Persist the selected file and update frontmatter.
  }}
  onEditCover={() => {
    // Open the edit modal when a cover already exists.
  }}
/>
```

### Key props

- `size` – Square dimension (number ⇒ pixels or string) with a default of `80px`.
- `strategy` – Object-fit strategy (`"cover"` by default, accepts `"contain"`).
- `placeholderIcon` / `placeholderIconClassName` – Icon and size for the empty state.
- `onSelectCover(filePath, file)` – Called after the user picks a new file. The first argument
  is the file path reported by the Obsidian file input, the second is the `File` object so
  containers can create attachments.
- `onEditCover()` – Invoked when the user clicks an existing cover. Use it to open the edit
  modal or navigate to the attachment.
- `isLoading` / `disabled` – Toggle busy state for upload flows.

When `onSelectCover` is omitted the placeholder renders as a disabled button, allowing the
component to serve display-only cases.

### Patterns

- Always prefer this component over bespoke cover markup.
- Pass context-aware `selectLabel` / `editLabel` strings for accessibility.
- Apply `coverClassName` / `placeholderClassName` to layer additional borders or background
  colours without reimplementing the internals.

See `EntityHeaderMondo`, `EntityHeaderUnknown`, the vault notes view, and the entity grid cover
cell for usage examples.
