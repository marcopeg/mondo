import {
  App,
  MarkdownView,
  Notice,
  Platform,
  moment,
} from "obsidian";
import type momentModule from "moment";
import type CRM from "@/main";
import {
  buildTimestampFromMoment,
  normalizeTimestampSettings,
} from "@/types/TimestampSettings";

export const insertTimestamp = (
  app: App,
  plugin: CRM,
  options: { showFailureNotice?: boolean } = {}
) => {
  const showFailureNotice = options.showFailureNotice !== false;
  const view = app.workspace.getActiveViewOfType(MarkdownView);

  if (!view || !view.editor) {
    if (showFailureNotice) {
      const reason = Platform.isMobileApp
        ? "Open a note to insert a timestamp."
        : "Focus a markdown editor to insert a timestamp.";
      new Notice(reason);
    }
    return false;
  }

  const editor = view.editor;
  const settings = normalizeTimestampSettings(
    (plugin as any).settings?.timestamp
  );

  const momentFactory = moment as unknown as typeof momentModule;

  const value = buildTimestampFromMoment({
    moment: momentFactory(),
    settings,
    includeTrailingNewLine: true,
  });

  editor.replaceSelection(value);
  return true;
};
