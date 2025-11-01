# Mondo Features

This document summarises the functionality exposed by the Mondo Obsidian plugin based on the current codebase.

## Global behaviours

- **Entity-aware rendering** – Notes with a frontmatter `type` matching the active configuration are treated as Mondo entities. The plugin injects a rich header, link panels, and context-aware actions (`src/events/inject-mondo-links.tsx`, `src/containers/EntityHeader`).
- **Configuration driven** – `src/mondo-config.json` (or the JSON pasted through settings) describes entities, dashboards, quick search tiles, link panels, and creation presets (`src/entities/index.ts`, `src/utils/MondoConfigManager.ts`).
- **Workspace integration** – React views are registered as Obsidian panes (dashboard, entity panel, vault browsers, audio logs) and Markdown post processors (code blocks, transcription decorations) inside `src/main.ts`.

## Dashboard view (`DASHBOARD_VIEW`)

Entry point: `src/views/dashboard-view/wrapper.tsx`.

- **Quick Tasks** – Displays `task` notes tagged as `status: quick`, allows inline completion and promotion into tasks, projects, or logs (`src/views/dashboard-view/QuickTasks/QuickTasks.tsx`, `src/hooks/use-inbox-tasks.ts`).
- **Relevant Notes** – Highlights frequently touched Mondo notes and recent history, with entity filters defined by configuration (`src/views/dashboard-view/RelevantNotes/RelevantNotes.tsx`).
- **Quick Search** – Entity-specific search/create widgets that open existing notes or create a templated note using `createEntityNoteFromInput` (`src/views/dashboard-view/QuickSearch/QuickSearchPanel.tsx`).
- **Entity tiles & IMS buttons** – Launchers for entity lists, daily note, journal, dictation, transcription and voiceover actions (`src/views/dashboard-view/components`).
- **Vault stats** – Cards summarising counts of notes, attachments, audio, and storage usage (`src/views/dashboard-view/components/VaultStatsSection`).

## Additional views

- **Entity panel** – Dedicated pane for browsing an entity type with configurable columns and actions (`src/views/entity-panel-view/wrapper.tsx`, `src/views/entity-panel-view/EntityView.tsx`).
- **Audio logs** – Lists audio files, tracks transcription status, links transcripts, plays audio inline, and queues transcriptions through `AudioTranscriptionManager` (`src/views/audio-logs-view/AudioLogsView.tsx`).
- **Vault browsers** – Panels for images, files, and notes that surface metadata, preview thumbnails, and quick actions (`src/views/vault-images-view`, `src/views/vault-files-view`, `src/views/vault-notes-view`).
- **Inline code blocks** – The `mondo` Markdown code block renders journal navigation, habit tracker, and timer blocks based on YAML/inline parameters (`src/views/code-block-view/CodeBlockView.tsx`).

## Commands (`src/main.ts` registration)

- `Open Mondo dashboard`, `Open Audio Notes`, `Open Images/Files/Markdown Notes` – Open the respective item views.
- `Edit Image` – Opens the in-app image editor for the focused or selected file (`src/commands/image.edit.ts`, `src/utils/EditImageModal.ts`).
- `Start transcription` – Sends an audio file to Whisper and creates a transcription note (`src/commands/daily.addLog.ts`, `src/utils/AudioTranscriptionManager.ts`).
- `Start dictation` – Records microphone audio and inserts the transcript into the current note with a stop/resume toggle (`src/utils/NoteDictationManager.tsx`).
- `Start voiceover` – Converts the current note (or selection) into audio using OpenAI voices and caches the output (`src/utils/VoiceoverManager.ts`).
- `Open Journal`, `Move to Previous/Next Journal Entry` – Navigates journal structure with keyboard shortcuts and view injections (`src/commands/journal.open.ts`, `src/commands/journal.nav.ts`, `src/events/inject-journal-nav.ts`).
- `Open Daily note`, `Append to Daily note`, `Add Daily Log` – Maintains per-day notes with timestamped sections and logging helpers (`src/commands/daily.open.ts`, `src/commands/daily.addLog.ts`).
- `Insert timestamp` – Inserts formatted timestamps with configurable templates and optional toolbar button (`src/commands/timestamp.insert.ts`, `src/utils/TimestampToolbarManager.ts`).
- `Copy note text` – Copies the selection or cleansed note body to the clipboard (`src/commands/note.copyText.ts`).
- `Send to ChatGPT` – Opens chat.openai.com with the current note content, optionally stripping frontmatter (`src/commands/chatgpt.send.ts`).
- `Open Self Person` – Jumps to the “self” person entity configured in settings (`src/commands/self.open.ts`, `src/utils/selfPerson.ts`).
- `Open Mondo settings` – Opens the plugin’s settings tab.
- Entity-specific commands (`Open <Entity>`, `New <Entity>`) – Created dynamically for every configured entity type, opening the list view or creating a templated note (`src/main.ts`, `src/utils/createEntityNoteFromInput.ts`).

## Audio & voice features

- **AudioTranscriptionManager** – Watches for audio files, matches transcripts, queues background transcription jobs, and decorates Markdown with playback controls (`src/utils/AudioTranscriptionManager.ts`).
- **VoiceoverManager** – Generates speech for notes/selections, caches audio files, and updates frontmatter with references (`src/utils/VoiceoverManager.ts`).
- **NoteDictationManager** – Manages recording sessions, mobile toolbar integration, status toasts, and cleanup (`src/utils/NoteDictationManager.tsx`).

## Daily & journal automation

- **DailyNoteTracker** – Logs created/modified/opened files per day, ensuring daily notes capture activity history (`src/utils/DailyNoteTracker.ts`).
- **Journal navigation bar** – Injects navigation controls into journal notes (`src/events/inject-journal-nav.ts`, `src/containers/JournalNav`).
- **Habit tracker container** – Renders streak/calendar views driven by frontmatter-backed data stored in the note (`src/containers/HabitTracker`).
- **Timer blocks** – Countdown / training timer UI embedded via code blocks (`src/containers/TimerBlock`).

## Entity experience

- **Entity header** – Displays cover image, metadata, quick actions, and related-note creation for known types (`src/containers/EntityHeader`).
- **Link panels** – Config-driven React panels (backlinks, meetings, tasks, projects, custom implementations) rendered beneath the header (`src/containers/EntityLinks`).
- **Create-related flows** – Buttons that spawn linked notes (reports, meetings, tasks) using templated attributes and property linking (`src/utils/createEntityForEntity.ts`, `src/utils/createMeetingForPerson.ts`, etc.).
- **Quick search + creation** – Dashboard cards and settings quick search list referencing the config’s `quickSearch.entities` order.
- **Self person resolution** – Utilities to resolve the configured “self” entity and update tasks/logs accordingly (`src/utils/selfPerson.ts`, `src/hooks/use-inbox-tasks.ts`).

## Settings surface

The settings tab (`src/views/settings/SettingsView.tsx`) exposes:

- Root folders per entity type, with folder pickers (`rootPaths`).
- Templates per entity (`templates`).
- Audio credentials and tuning (`openAIWhisperApiKey`, `openAIModel`, `openAIVoice`, `openAITranscriptionPolishEnabled`).
- Voiceover cache folder and toggles for mobile toolbars (`VoiceoverManager`, `TimestampToolbarManager`, `CopyNoteToolbarManager`).
- Daily/journal paths and naming templates, plus quick-task inbox root (`renderDailySection`, `renderJournalSection`, `renderGeneralSection`).
- Timestamp format options, including toolbar enablement (`renderTimestampsSection`).
- Dashboard toggles (auto-open, force tab, enable/disable cards) (`renderDashboardSection`).
- Mondo config management: paste JSON, choose presets, watch external JSON files via `MondoConfigManager` hooks.

## Utilities & helpers

- **Focus mode** – Hides UI chrome and restores the layout when toggled (`src/utils/focusMode.ts`).
- **Geolocation** – Captures latitude/longitude into frontmatter with cancellation handling (`src/utils/geolocation.ts`, `src/main.ts` `applyGeolocationToFile`).
- **File management** – `MondoFileManager` indexes frontmatter and caches metadata to power list views and quick filters (`src/utils/MondoFileManager.ts`).
- **Templates** – `MondoTemplates` renders template strings with tokens for new note creation (`src/utils/MondoTemplates.ts`).
- **Toolbar managers** – Enable mobile toolbar buttons for dictation, timestamps, and copy note operations (`src/utils/NoteDictationManager.tsx`, `src/utils/TimestampToolbarManager.ts`, `src/utils/CopyNoteToolbarManager.ts`).
- **Creation helpers** – Utility functions to create linked entities (facts, logs, tasks, documents) with consistent metadata (`src/utils/createFactForEntity.ts`, `src/utils/createLogForEntity.ts`, etc.).
- **Metadata helpers** – Utilities for deriving display names, formatting project info, matching property links, and slugifying titles (`src/utils/getEntityDisplayName.ts`, `src/utils/getProjectDisplayInfo.ts`, `src/utils/matchesPropertyLink.ts`, `src/utils/createLinkedNoteHelpers.ts`).

## Markdown decorations

- **Transcription overlay** – Adds progress overlays to notes while transcription is running (`src/utils/TranscriptionOverlay.ts`).
- **Audio playback controls** – Markdown post-processor that augments audio note embeds when transcripts exist (`AudioTranscriptionManager.decorateMarkdown`).

## Ribbon & mobile integration

- Dashboard and Audio Notes ribbon icons on desktop (`src/main.ts`).
- Mobile toolbars for dictation, timestamps, and copy note commands, activated when the workspace becomes ready (`src/main.ts`, respective managers).

## Error handling & lifecycle

- Config reload on file changes, deletion handling, and preset fallbacks (`src/utils/MondoConfigManager.ts`).
- Abortable geolocation requests with UI notices (`src/main.ts`).
- Graceful cleanup when views close (React roots unmounted in each wrapper).
