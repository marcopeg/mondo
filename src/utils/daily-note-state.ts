type DailyNoteState = Record<string, unknown> & {
  created: unknown;
  changed: unknown;
  opened: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getDailyNoteState = (
  frontmatter: Record<string, unknown> | undefined
): DailyNoteState => {
  if (!frontmatter) {
    return {
      created: undefined,
      changed: undefined,
      opened: undefined,
    };
  }

  const root = frontmatter as Record<string, unknown> & {
    crmState?: unknown;
    createdToday?: unknown;
    changedToday?: unknown;
    modifiedToday?: unknown;
    openedToday?: unknown;
  };

  let created: unknown = undefined;
  let changed: unknown = undefined;
  let opened: unknown = undefined;

  if (isPlainObject(root.crmState)) {
    const crmState = root.crmState as Record<string, unknown> & {
      created?: unknown;
      changed?: unknown;
      opened?: unknown;
      dailyNote?: unknown;
    };

    if (crmState.created !== undefined) {
      created = crmState.created;
    }
    if (crmState.changed !== undefined) {
      changed = crmState.changed;
    }
    if (crmState.opened !== undefined) {
      opened = crmState.opened;
    }

    if (isPlainObject(crmState.dailyNote)) {
      const legacyDailyNote = crmState.dailyNote as Record<string, unknown> & {
        created?: unknown;
        createdToday?: unknown;
        changed?: unknown;
        changedToday?: unknown;
        modifiedToday?: unknown;
        opened?: unknown;
        openedToday?: unknown;
      };

      if (created === undefined) {
        created =
          legacyDailyNote.created ?? legacyDailyNote.createdToday ?? undefined;
      }
      if (changed === undefined) {
        changed =
          legacyDailyNote.changed ??
          legacyDailyNote.changedToday ??
          legacyDailyNote.modifiedToday ??
          undefined;
      }
      if (opened === undefined) {
        opened = legacyDailyNote.opened ?? legacyDailyNote.openedToday ?? undefined;
      }
    }
  }

  if (created === undefined) {
    created = root.createdToday ?? undefined;
  }
  if (changed === undefined) {
    changed = root.changedToday ?? root.modifiedToday ?? undefined;
  }
  if (opened === undefined) {
    opened = root.openedToday ?? undefined;
  }

  return {
    created,
    changed,
    opened,
  };
};

export type { DailyNoteState };
