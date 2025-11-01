import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import type Mondo from "@/main";
import { AppProvider } from "@/context/AppProvider";
import { AUDIO_LOGS_VIEW } from "./constants";
import { AudioLogsView } from "./AudioLogsView";

export class MondoAudioLogsViewWrapper extends ItemView {
  private root: Root | null = null;
  private plugin: Mondo;
  private iconName: string;

  constructor(plugin: Mondo, leaf: WorkspaceLeaf, iconName: string) {
    super(leaf);
    this.plugin = plugin;
    this.iconName = iconName;
  }

  getViewType() {
    return AUDIO_LOGS_VIEW;
  }

  getDisplayText() {
    return "Audio Notes";
  }

  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <AudioLogsView plugin={this.plugin} />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
