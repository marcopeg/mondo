# EMS Entity Property Controls Plan

## Objective
- Extend the Mondo configuration so each EMS entity declares the optional properties that can be auto-inserted into frontmatter.
- Surface header controls in the EMS detail view that let users add each missing property with a single interaction.
- Respect property multiplicity (single vs. list), validation rules, and constraint limits while updating the note.

## Configuration Schema Additions
- Add a new `properties` block under every entity inside `mondo-config.json` (and matching TypeScript types).
- Each property entry contains:
  - `key`: frontmatter field name (e.g., `company`).
  - `label`: UI label for the control (defaults to key if omitted).
  - `cardinality`: `"single" | "list"` to model single value vs. multiple values.
  - `valueType`: semantic type for validation (e.g., `"company"`, array of allowed entity types, or `"string"` for primitives).
  - `validators`: optional array of validation strategies (`"existingEntity"`, `"file"`, regex, etc.).
  - `constraints`: optional object (`maxItems`, `minItems`, `allowDuplicates`, etc.).
  - `defaultValue`: optional fallback inserted when creating a new property list entry (e.g., empty object).
- Provide documentation and default config updates (`src/mondo-config.full.json`) to illustrate usage.
- Update schema TypeScript interfaces (`src/types/...`) and validation utilities to enforce the structure when the JSON loads.

## Runtime Loading and Storage
- Extend the config loader hook(s) to map `properties` into a normalized structure (e.g., dictionary by entity type with arrays of property definitions).
- Memoize derived helpers:
  - `getEntityProperties(entityType)` returning the definitions array.
  - `getPropertyConstraints(entityType, key)` for quick validation.
- Ensure runtime overrides from plugin settings can also define `properties` (merge semantics).

## EMS UI Integration Strategy
- Identify the EMS entity header component (likely under `src/containers` or `src/views/ems`).
- Introduce a hook (`useEntityPropertyControls`) that:
  - Receives the current entity type and note frontmatter.
  - Cross-references `properties` definitions to determine missing or incomplete fields.
  - Applies cardinality rules (e.g., treat empty array as missing, count existing items).
- The hook returns control descriptors (`{ label, key, disabled, reason }`), factoring constraint violations (e.g., max reached).
- Render a segmented control group or menu button in the EMS header that lists available actions (`Add company`, `Add team`, etc.).
- When a user invokes an action:
  - Open the appropriate picker/modal depending on `valueType` (entity selector, text input, etc.).
  - Upon confirmation, update the note frontmatter using existing editing utilities (ensuring updates respect Obsidian file API).

## Validation & Constraints
- Implement reusable validators per `valueType`:
  - Entity selectors validate that chosen notes match allowed entity types.
  - Primitive validators enforce regex or enumerated values.
- Enforce `maxItems`, `minItems`, and deduplication rules before committing changes.
- Provide user feedback (toast or inline warning) when constraints prevent adding a property.

## Edge Cases & UX Safeguards
- Handle read-only/locked notes by disabling controls.
- If the configuration lists a property already present, hide the action.
- For multi-value properties, allow repeated additions until `maxItems` is reached.
- Respect existing Obsidian undo stack by batching updates within a single file modification transaction.

## Implementation Phases
1. **Schema & Types**: Update config JSON, TypeScript interfaces, validators, and documentation. Add tests covering schema parsing.
2. **Hooks**: Create selectors/helpers to surface property definitions and state (missing, constrained, etc.).
3. **UI Controls**: Modify the EMS header container to display property actions via new hook output.
4. **Interaction Layer**: Implement add-property flows per validator type (entity picker, text prompt). Reuse existing dialogs where possible.
5. **Quality**: Add unit tests for new helpers and validators, plus integration tests covering UI control enablement. Document the feature in `docs/` with usage instructions.

## Open Questions
- Which existing modal components can be reused for entity selection vs. new components required?
- Should configuration support custom validation messages per property?
- How to handle legacy notes that store properties in nested frontmatter structures (objects vs. scalars)?
