# EntityHeader components

- `EntityHeader.tsx` should remain a thin delegator: it only inspects the current note type, checks it against the configured Mondo entity list, and chooses between `EntityHeaderMondo` (known type) and `EntityHeaderUnknown` (unknown type). If no entity types are configured it must return `null`.
- `EntityHeaderMondo.tsx` owns the full header layout for known entities. It is responsible for rendering the cover preview, note metadata (name and type label), and the "Add Related" split button that triggers panel actions.
- `EntityHeaderUnknown.tsx` renders the same header frame but focuses on helping the user assign a Mondo entity type via the "Create as Mondo Note" split button.
- Both sub-components fetch their own data (file details, cover, etc.) via hooks so that `EntityHeader` stays presentation-agnostic.
