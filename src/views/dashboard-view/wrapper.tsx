import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { DashboardView } from "./DashboardView";

export const DASHBOARD_VIEW = "dashboard-view";

export class MondoDashboardViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;

  constructor(leaf: WorkspaceLeaf, iconName: string) {
    super(leaf);
    this.iconName = iconName;
  }

  getViewType() {
    return DASHBOARD_VIEW;
  }
  getDisplayText() {
    return "Mondo Dashboard";
  }
  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <DashboardView />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
