/**
 * Shape for miscellaneous folder paths used by the plugin.
 */
export interface CRMJournalSettings {
  root: string; // folder where journal entries are stored
  entry: string; // filename format for journal entries (e.g. YYYY-MM-DD)
}

export interface CRMDailySettings {
  root: string; // folder where daily notes are stored
  entry: string; // filename format for daily entries (e.g. YYYY-MM-DD)
  note: string; // note filename/time format inside a daily note (e.g. HH:MM)
  section?: string; // heading level for daily notes (h1..h6)
  useBullets?: boolean; // whether to prefix new daily entries with a bullet
}

/** Defaults for journal settings */
export const DEFAULT_CRM_JOURNAL_SETTINGS: CRMJournalSettings = {
  root: "Journal",
  entry: "YYYY-MM-DD",
};

/** Defaults for daily settings */
export const DEFAULT_CRM_DAILY_SETTINGS: CRMDailySettings = {
  root: "Daily",
  entry: "YYYY-MM-DD",
  note: "HH:MM",
  section: "h2",
  useBullets: true,
};
